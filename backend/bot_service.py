import asyncio
import logging
from typing import Dict, Optional, Any, List
from datetime import datetime
import json
import hmac
import hashlib
import aiohttp
from fastapi import HTTPException
from sqlalchemy.orm import Session

from .database import get_database
from .models import School, User, Notification, AIConversation, SystemLog
from .ai_service import AIService
from .utils import send_email, send_sms, format_phone_number

logger = logging.getLogger(__name__)

class TelegramBot:
    """Telegram Bot integration for school-specific interactions"""
    
    def __init__(self, bot_token: str, school_id: str):
        self.bot_token = bot_token
        self.school_id = school_id
        self.base_url = f"https://api.telegram.org/bot{bot_token}"
        self.webhook_url = None
        
    async def send_message(self, chat_id: str, text: str, reply_markup: Optional[Dict] = None) -> bool:
        """Send a message to a Telegram chat"""
        try:
            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True
            }
            
            if reply_markup:
                payload["reply_markup"] = json.dumps(reply_markup)
            
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/sendMessage", json=payload) as response:
                    if response.status == 200:
                        return True
                    else:
                        logger.error(f"Failed to send Telegram message: {await response.text()}")
                        return False
        except Exception as e:
            logger.error(f"Error sending Telegram message: {str(e)}")
            return False
    
    async def send_document(self, chat_id: str, document_path: str, caption: str = "") -> bool:
        """Send a document to a Telegram chat"""
        try:
            with open(document_path, 'rb') as doc:
                data = aiohttp.FormData()
                data.add_field('chat_id', chat_id)
                data.add_field('document', doc, filename=document_path.split('/')[-1])
                data.add_field('caption', caption)
                
                async with aiohttp.ClientSession() as session:
                    async with session.post(f"{self.base_url}/sendDocument", data=data) as response:
                        return response.status == 200
        except Exception as e:
            logger.error(f"Error sending Telegram document: {str(e)}")
            return False
    
    async def set_webhook(self, webhook_url: str) -> bool:
        """Set webhook for receiving updates"""
        try:
            payload = {
                "url": webhook_url,
                "allowed_updates": ["message", "callback_query"]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/setWebhook", json=payload) as response:
                    if response.status == 200:
                        self.webhook_url = webhook_url
                        return True
                    return False
        except Exception as e:
            logger.error(f"Error setting Telegram webhook: {str(e)}")
            return False

class WhatsAppBot:
    """WhatsApp Business API integration for school communications"""
    
    def __init__(self, access_token: str, phone_number_id: str, school_id: str):
        self.access_token = access_token
        self.phone_number_id = phone_number_id
        self.school_id = school_id
        self.base_url = f"https://graph.facebook.com/v18.0/{phone_number_id}"
        
    async def send_message(self, to: str, message_type: str = "text", **kwargs) -> bool:
        """Send a WhatsApp message"""
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "to": format_phone_number(to),
                "type": message_type
            }
            
            if message_type == "text":
                payload["text"] = {"body": kwargs.get("text", "")}
            elif message_type == "template":
                payload["template"] = kwargs.get("template", {})
            elif message_type == "document":
                payload["document"] = kwargs.get("document", {})
            
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/messages", 
                                      json=payload, headers=headers) as response:
                    if response.status == 200:
                        return True
                    else:
                        logger.error(f"Failed to send WhatsApp message: {await response.text()}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error sending WhatsApp message: {str(e)}")
            return False
    
    async def send_template_message(self, to: str, template_name: str, 
                                  language_code: str = "en", 
                                  parameters: Optional[List[str]] = None) -> bool:
        """Send a WhatsApp template message"""
        template_data = {
            "name": template_name,
            "language": {"code": language_code}
        }
        
        if parameters:
            template_data["components"] = [{
                "type": "body",
                "parameters": [{"type": "text", "text": param} for param in parameters]
            }]
        
        return await self.send_message(to, "template", template=template_data)

class BotService:
    """Unified bot service managing Telegram and WhatsApp integrations"""
    
    def __init__(self):
        self.telegram_bots: Dict[str, TelegramBot] = {}
        self.whatsapp_bots: Dict[str, WhatsAppBot] = {}
        self.ai_service = AIService()
        
    def register_telegram_bot(self, school_id: str, bot_token: str) -> bool:
        """Register a Telegram bot for a school"""
        try:
            self.telegram_bots[school_id] = TelegramBot(bot_token, school_id)
            logger.info(f"Registered Telegram bot for school {school_id}")
            return True
        except Exception as e:
            logger.error(f"Error registering Telegram bot: {str(e)}")
            return False
    
    def register_whatsapp_bot(self, school_id: str, access_token: str, phone_number_id: str) -> bool:
        """Register a WhatsApp bot for a school"""
        try:
            self.whatsapp_bots[school_id] = WhatsAppBot(access_token, phone_number_id, school_id)
            logger.info(f"Registered WhatsApp bot for school {school_id}")
            return True
        except Exception as e:
            logger.error(f"Error registering WhatsApp bot: {str(e)}")
            return False
    
    async def process_telegram_update(self, school_id: str, update: Dict[str, Any]) -> bool:
        """Process incoming Telegram update"""
        try:
            if school_id not in self.telegram_bots:
                logger.error(f"No Telegram bot registered for school {school_id}")
                return False
            
            bot = self.telegram_bots[school_id]
            
            # Handle regular message
            if "message" in update:
                message = update["message"]
                chat_id = str(message["chat"]["id"])
                user_message = message.get("text", "")
                
                if user_message.startswith("/"):
                    await self._handle_telegram_command(bot, chat_id, user_message, school_id)
                else:
                    await self._handle_telegram_message(bot, chat_id, user_message, school_id)
            
            # Handle callback query (inline buttons)
            elif "callback_query" in update:
                callback = update["callback_query"]
                chat_id = str(callback["message"]["chat"]["id"])
                callback_data = callback["data"]
                
                await self._handle_telegram_callback(bot, chat_id, callback_data, school_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing Telegram update: {str(e)}")
            return False
    
    async def process_whatsapp_update(self, school_id: str, update: Dict[str, Any]) -> bool:
        """Process incoming WhatsApp update"""
        try:
            if school_id not in self.whatsapp_bots:
                logger.error(f"No WhatsApp bot registered for school {school_id}")
                return False
            
            bot = self.whatsapp_bots[school_id]
            
            # Handle incoming message
            if "messages" in update:
                for message in update["messages"]:
                    from_number = message["from"]
                    message_type = message["type"]
                    
                    if message_type == "text":
                        text_content = message["text"]["body"]
                        await self._handle_whatsapp_message(bot, from_number, text_content, school_id)
                    elif message_type == "interactive":
                        await self._handle_whatsapp_interactive(bot, from_number, message["interactive"], school_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing WhatsApp update: {str(e)}")
            return False
    
    async def _handle_telegram_command(self, bot: TelegramBot, chat_id: str, command: str, school_id: str):
        """Handle Telegram commands"""
        command_lower = command.lower()
        
        if command_lower.startswith("/start"):
            welcome_message = await self._get_welcome_message(school_id)
            keyboard = {
                "inline_keyboard": [
                    [{"text": "📚 Academic Info", "callback_data": "academic_info"}],
                    [{"text": "📅 Schedule", "callback_data": "schedule"}],
                    [{"text": "📞 Contact", "callback_data": "contact"}],
                    [{"text": "🤖 Ask AI", "callback_data": "ask_ai"}]
                ]
            }
            await bot.send_message(chat_id, welcome_message, keyboard)
        
        elif command_lower.startswith("/help"):
            help_message = """
🤖 <b>School Nexus Bot Commands</b>

/start - Show main menu
/help - Show this help message
/schedule - View your schedule
/grades - Check your grades
/attendance - View attendance
/announcements - Latest announcements
/ai - Ask AI assistant

You can also send regular messages to interact with our AI assistant!
            """
            await bot.send_message(chat_id, help_message)
        
        elif command_lower.startswith("/schedule"):
            # Get user schedule
            schedule_info = await self._get_user_schedule(chat_id, school_id)
            await bot.send_message(chat_id, schedule_info)
    
    async def _handle_telegram_message(self, bot: TelegramBot, chat_id: str, message: str, school_id: str):
        """Handle regular Telegram messages with AI"""
        try:
            # Get AI response
            ai_response = await self.ai_service.get_ai_response(
                message=message,
                user_role="visitor",  # Default role for bot users
                school_id=school_id,
                context="telegram_bot"
            )
            
            await bot.send_message(chat_id, ai_response["response"])
            
        except Exception as e:
            logger.error(f"Error handling Telegram message: {str(e)}")
            await bot.send_message(chat_id, "Sorry, I encountered an error. Please try again later.")
    
    async def _handle_telegram_callback(self, bot: TelegramBot, chat_id: str, callback_data: str, school_id: str):
        """Handle Telegram callback queries"""
        if callback_data == "academic_info":
            info = await self._get_academic_info(school_id)
            await bot.send_message(chat_id, info)
        
        elif callback_data == "schedule":
            schedule = await self._get_user_schedule(chat_id, school_id)
            await bot.send_message(chat_id, schedule)
        
        elif callback_data == "contact":
            contact_info = await self._get_contact_info(school_id)
            await bot.send_message(chat_id, contact_info)
        
        elif callback_data == "ask_ai":
            ai_prompt = "Ask me anything about the school, academics, or general questions. I'm here to help! 🤖"
            await bot.send_message(chat_id, ai_prompt)
    
    async def _handle_whatsapp_message(self, bot: WhatsAppBot, from_number: str, message: str, school_id: str):
        """Handle WhatsApp text messages"""
        try:
            # Get AI response
            ai_response = await self.ai_service.get_ai_response(
                message=message,
                user_role="visitor",
                school_id=school_id,
                context="whatsapp_bot"
            )
            
            await bot.send_message(from_number, "text", text=ai_response["response"])
            
        except Exception as e:
            logger.error(f"Error handling WhatsApp message: {str(e)}")
            await bot.send_message(from_number, "text", 
                                 text="Sorry, I encountered an error. Please try again later.")
    
    async def _get_welcome_message(self, school_id: str) -> str:
        """Get welcome message for school"""
        db = next(get_database())
        try:
            school = db.query(School).filter(School.id == school_id).first()
            if school:
                return f"""
🎓 <b>Welcome to {school.name}!</b>

I'm your AI assistant here to help with:
• Academic information and schedules
• School announcements and events  
• General questions about our programs
• Contact information and directions

How can I assist you today?
                """
            else:
                return "Welcome to School Nexus! How can I help you today?"
        finally:
            db.close()
    
    async def _get_academic_info(self, school_id: str) -> str:
        """Get academic information for school"""
        # This would fetch actual academic info from database
        return """
📚 <b>Academic Information</b>

🗓️ <b>Academic Year:</b> 2024-2025
📖 <b>Current Term:</b> First Term
📅 <b>Term Dates:</b> Sep 2024 - Dec 2024

<b>Programs Offered:</b>
• Primary Education (Grades 1-6)
• Secondary Education (Grades 7-12)
• Advanced Placement Courses
• Extracurricular Activities

For detailed curriculum information, please contact our academic office.
        """
    
    async def _get_user_schedule(self, user_id: str, school_id: str) -> str:
        """Get user schedule (would integrate with actual database)"""
        return """
📅 <b>Today's Schedule</b>

🕰️ <b>Monday, November 25, 2024</b>

08:00 - 09:00 | Mathematics
09:00 - 10:00 | English Literature  
10:00 - 10:15 | Break
10:15 - 11:15 | Science
11:15 - 12:15 | History
12:15 - 13:00 | Lunch
13:00 - 14:00 | Art
14:00 - 15:00 | Physical Education

Have a great day! 📚
        """
    
    async def _get_contact_info(self, school_id: str) -> str:
        """Get contact information for school"""
        db = next(get_database())
        try:
            school = db.query(School).filter(School.id == school_id).first()
            if school:
                return f"""
📞 <b>Contact Information</b>

🏫 <b>{school.name}</b>
📍 <b>Address:</b> {school.address or 'Address not available'}
📞 <b>Phone:</b> {school.phone or 'Phone not available'}
📧 <b>Email:</b> {school.email or 'Email not available'}
🌐 <b>Website:</b> {school.website or 'Website not available'}

<b>Office Hours:</b>
Monday - Friday: 8:00 AM - 4:00 PM
Saturday: 9:00 AM - 1:00 PM

For emergencies, please call our main number.
                """
            else:
                return "Contact information not available."
        finally:
            db.close()
    
    async def send_broadcast_message(self, school_id: str, message: str, 
                                   platform: str = "both", user_roles: Optional[List[str]] = None):
        """Send broadcast message to all users of a school"""
        db = next(get_database())
        try:
            # Get users to notify
            query = db.query(User).filter(User.school_id == school_id, User.is_active == True)
            
            if user_roles:
                query = query.filter(User.role.in_(user_roles))
            
            users = query.all()
            
            for user in users:
                try:
                    # Send via Telegram if enabled and platform matches
                    if platform in ["telegram", "both"] and school_id in self.telegram_bots:
                        # Would need to store Telegram chat IDs for users
                        pass
                    
                    # Send via WhatsApp if enabled and platform matches
                    if platform in ["whatsapp", "both"] and school_id in self.whatsapp_bots and user.phone:
                        bot = self.whatsapp_bots[school_id]
                        await bot.send_message(user.phone, "text", text=message)
                    
                    # Also send via email/SMS as backup
                    if user.email:
                        await send_email(user.email, "School Notification", message)
                    
                except Exception as e:
                    logger.error(f"Error sending broadcast to user {user.id}: {str(e)}")
            
            # Log the broadcast
            log_entry = SystemLog(
                school_id=school_id,
                user_id=None,
                action="broadcast_message",
                details=f"Sent to {len(users)} users via {platform}",
                ip_address="system",
                timestamp=datetime.utcnow()
            )
            db.add(log_entry)
            db.commit()
            
        finally:
            db.close()
    
    def verify_telegram_webhook(self, token: str, update: Dict[str, Any]) -> bool:
        """Verify Telegram webhook authenticity"""
        # Telegram doesn't use signature verification like WhatsApp
        # But you can implement additional security measures here
        return True
    
    def verify_whatsapp_webhook(self, payload: str, signature: str, app_secret: str) -> bool:
        """Verify WhatsApp webhook signature"""
        try:
            expected_signature = hmac.new(
                app_secret.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(f"sha256={expected_signature}", signature)
        except Exception as e:
            logger.error(f"Error verifying WhatsApp webhook: {str(e)}")
            return False

# Global bot service instance
bot_service = BotService()