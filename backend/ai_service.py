import openai
import anthropic
import speech_recognition as sr
from typing import Dict, Any, List, Optional, Union
import json
import logging
from datetime import datetime
import asyncio
from io import BytesIO
import base64
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import tempfile
import os

from .config import settings
from .models import User, School, UserRole, DocumentType
from .database import db_service

logger = logging.getLogger(__name__)


class AIService:
    """AI Service for natural language processing and intelligent responses"""
    
    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None
        self.speech_recognizer = sr.Recognizer()
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize AI clients based on configuration"""
        if settings.OPENAI_API_KEY:
            openai.api_key = settings.OPENAI_API_KEY
            self.openai_client = openai
        
        if settings.ANTHROPIC_API_KEY:
            self.anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    async def process_message(
        self, 
        message: str, 
        user: User, 
        conversation_id: Optional[str] = None,
        voice_data: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """Process user message and generate AI response"""
        try:
            # Process voice input if provided
            if voice_data:
                message = await self._process_voice_input(voice_data)
                if not message:
                    return {
                        "response": "Sorry, I couldn't understand the audio. Please try again.",
                        "response_type": "text",
                        "error": "Voice processing failed"
                    }
            
            # Get conversation context
            conversation = await self._get_or_create_conversation(user, conversation_id)
            
            # Build system prompt based on user role and school context
            system_prompt = await self._build_system_prompt(user)
            
            # Get relevant data context
            context_data = await self._get_context_data(user, message)
            
            # Generate AI response
            ai_response = await self._generate_response(
                message, 
                system_prompt, 
                context_data, 
                conversation["messages"]
            )
            
            # Update conversation
            await self._update_conversation(
                conversation["id"], 
                message, 
                ai_response, 
                user.id
            )
            
            # Process special response types
            response_data = await self._process_response_type(ai_response, user)
            
            return {
                "response": response_data["content"],
                "conversation_id": conversation["id"],
                "response_type": response_data["type"],
                "metadata": response_data.get("metadata", {}),
                "suggestions": response_data.get("suggestions", [])
            }
            
        except Exception as e:
            logger.error(f"Error processing AI message: {e}")
            return {
                "response": "I'm experiencing some technical difficulties. Please try again later.",
                "response_type": "text",
                "error": str(e)
            }
    
    async def _process_voice_input(self, voice_data: bytes) -> Optional[str]:
        """Convert voice input to text using speech recognition"""
        try:
            # Save voice data to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(voice_data)
                temp_file_path = temp_file.name
            
            # Process with speech recognition
            with sr.AudioFile(temp_file_path) as source:
                audio = self.speech_recognizer.record(source)
                text = self.speech_recognizer.recognize_google(audio)
            
            # Clean up temporary file
            os.unlink(temp_file_path)
            
            return text
            
        except sr.UnknownValueError:
            logger.warning("Could not understand audio")
            return None
        except sr.RequestError as e:
            logger.error(f"Speech recognition error: {e}")
            return None
        except Exception as e:
            logger.error(f"Voice processing error: {e}")
            return None
    
    async def _build_system_prompt(self, user: User) -> str:
        """Build context-aware system prompt based on user role"""
        base_prompt = f"""
You are an AI assistant for School Nexus, a comprehensive school management system.
You are helping {user.full_name} ({user.role.value}) from {await self._get_school_name(user.school_id)}.

Your capabilities include:
- Answering questions about school data and statistics
- Helping with administrative tasks
- Generating reports and documents
- Providing insights and analytics
- Assisting with school management workflows

Always be helpful, accurate, and professional. If you need specific data to answer a question,
indicate what information you need. When presenting data, format it clearly and provide
actionable insights when possible.
"""
        
        # Add role-specific context
        if user.role == UserRole.SUPER_ADMIN:
            base_prompt += """
As a Super Admin, you have access to:
- System-wide statistics across all schools
- School management and oversight
- Platform configuration and settings
- User management across schools
"""
        elif user.role == UserRole.SCHOOL_ADMIN:
            base_prompt += """
As a School Admin, you can:
- Manage your school's users and data
- View school statistics and reports
- Configure school settings
- Oversee academic and administrative operations
"""
        elif user.role == UserRole.STAFF:
            base_prompt += """
As Staff, you can:
- Access relevant student and class information
- View academic reports and statistics
- Manage assigned classes and subjects
"""
        elif user.role == UserRole.STUDENT:
            base_prompt += """
As a Student, you can:
- View your academic progress and reports
- Access class schedules and announcements
- Check grades and attendance
"""
        
        return base_prompt
    
    async def _get_context_data(self, user: User, message: str) -> Dict[str, Any]:
        """Get relevant context data based on the user's query"""
        context = {}
        
        try:
            # Determine what data might be relevant based on the message
            message_lower = message.lower()
            
            # School statistics
            if any(word in message_lower for word in ['stats', 'statistics', 'count', 'total', 'how many']):
                if user.role == UserRole.SUPER_ADMIN:
                    context['stats'] = await db_service.get_school_stats()
                else:
                    context['stats'] = await db_service.get_school_stats(user.school_id)
            
            # User data
            if any(word in message_lower for word in ['users', 'students', 'staff', 'teachers']):
                if user.school_id:
                    context['users'] = await db_service.get_all(User, school_id=user.school_id)
            
            # School information
            if user.school_id and any(word in message_lower for word in ['school', 'institution']):
                school = await db_service.get_by_id(School, user.school_id)
                if school:
                    context['school'] = {
                        'name': school.name,
                        'status': school.status.value,
                        'subscription_plan': school.subscription_plan.value,
                        'total_users': school.total_users
                    }
            
        except Exception as e:
            logger.error(f"Error getting context data: {e}")
        
        return context
    
    async def _generate_response(
        self, 
        message: str, 
        system_prompt: str, 
        context_data: Dict[str, Any],
        conversation_history: List[Dict[str, Any]]
    ) -> str:
        """Generate AI response using configured AI provider"""
        
        # Build messages for AI
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add context data if available
        if context_data:
            context_text = "Current context data:\n" + json.dumps(context_data, indent=2, default=str)
            messages.append({"role": "system", "content": context_text})
        
        # Add conversation history (last 10 messages)
        for msg in conversation_history[-10:]:
            messages.append(msg)
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        try:
            if settings.AI_PROVIDER == "openai" and self.openai_client:
                response = await self._generate_openai_response(messages)
            elif settings.AI_PROVIDER == "anthropic" and self.anthropic_client:
                response = await self._generate_anthropic_response(messages)
            else:
                response = "I'm sorry, but AI services are currently unavailable."
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return "I'm experiencing some technical difficulties. Please try again later."
    
    async def _generate_openai_response(self, messages: List[Dict[str, Any]]) -> str:
        """Generate response using OpenAI API"""
        try:
            response = await self.openai_client.ChatCompletion.acreate(
                model=settings.AI_MODEL,
                messages=messages,
                max_tokens=1000,
                temperature=0.7,
                stream=False
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise
    
    async def _generate_anthropic_response(self, messages: List[Dict[str, Any]]) -> str:
        """Generate response using Anthropic API"""
        try:
            # Convert messages format for Anthropic
            system_content = ""
            user_messages = []
            
            for msg in messages:
                if msg["role"] == "system":
                    system_content += msg["content"] + "\n"
                else:
                    user_messages.append(msg)
            
            response = await self.anthropic_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1000,
                system=system_content,
                messages=user_messages
            )
            
            return response.content[0].text
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise
    
    async def _process_response_type(self, response: str, user: User) -> Dict[str, Any]:
        """Process AI response and determine response type"""
        
        # Check if response indicates a specific action
        response_lower = response.lower()
        
        # Table/Chart generation
        if any(word in response_lower for word in ['table', 'chart', 'graph', 'visualization']):
            if 'stats' in response_lower or 'statistics' in response_lower:
                chart_data = await self._generate_stats_chart(user)
                if chart_data:
                    return {
                        "content": response,
                        "type": "chart",
                        "metadata": {"chart_url": chart_data}
                    }
        
        # Document generation
        if any(word in response_lower for word in ['document', 'report', 'generate', 'create']):
            return {
                "content": response,
                "type": "document",
                "metadata": {"can_generate": True},
                "suggestions": ["Generate ID Card", "Generate Report Card", "Generate Certificate"]
            }
        
        # Default text response
        return {
            "content": response,
            "type": "text",
            "suggestions": self._generate_suggestions(user)
        }
    
    def _generate_suggestions(self, user: User) -> List[str]:
        """Generate contextual suggestions based on user role"""
        base_suggestions = [
            "Show me school statistics",
            "What's my role and permissions?",
            "Help me with common tasks"
        ]
        
        if user.role == UserRole.SUPER_ADMIN:
            return base_suggestions + [
                "Show all schools status",
                "Generate system report",
                "Show user distribution"
            ]
        elif user.role == UserRole.SCHOOL_ADMIN:
            return base_suggestions + [
                "Show student enrollment",
                "Generate staff report",
                "Show class distribution"
            ]
        elif user.role == UserRole.STAFF:
            return base_suggestions + [
                "Show my classes",
                "Student performance report",
                "Attendance summary"
            ]
        elif user.role == UserRole.STUDENT:
            return base_suggestions + [
                "Show my grades",
                "Class schedule",
                "My attendance record"
            ]
        
        return base_suggestions
    
    async def _generate_stats_chart(self, user: User) -> Optional[str]:
        """Generate statistics chart"""
        try:
            # Get statistics data
            if user.role == UserRole.SUPER_ADMIN:
                stats = await db_service.get_school_stats()
            else:
                stats = await db_service.get_school_stats(user.school_id)
            
            # Create chart
            plt.figure(figsize=(10, 6))
            categories = list(stats.keys())
            values = list(stats.values())
            
            plt.bar(categories, values, color=['#3B82F6', '#10B981', '#F59E0B', '#EF4444'])
            plt.title('School Statistics')
            plt.ylabel('Count')
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            # Save to temporary file and convert to base64
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
                plt.savefig(temp_file.name, format='png', dpi=150, bbox_inches='tight')
                plt.close()
                
                with open(temp_file.name, 'rb') as f:
                    chart_data = base64.b64encode(f.read()).decode()
                
                os.unlink(temp_file.name)
                
                return f"data:image/png;base64,{chart_data}"
                
        except Exception as e:
            logger.error(f"Error generating chart: {e}")
            return None
    
    async def generate_document(
        self, 
        document_type: DocumentType, 
        user: User, 
        template_data: Dict[str, Any]
    ) -> Optional[str]:
        """Generate document based on type and template data"""
        try:
            if document_type == DocumentType.ID_CARD:
                return await self._generate_id_card(user, template_data)
            elif document_type == DocumentType.REPORT_CARD:
                return await self._generate_report_card(user, template_data)
            elif document_type == DocumentType.CERTIFICATE:
                return await self._generate_certificate(user, template_data)
            else:
                return await self._generate_generic_document(document_type, user, template_data)
        except Exception as e:
            logger.error(f"Error generating document: {e}")
            return None
    
    async def _generate_id_card(self, user: User, data: Dict[str, Any]) -> str:
        """Generate ID card document"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center
        )
        
        school = await db_service.get_by_id(School, user.school_id)
        school_name = school.name if school else "School Name"
        
        story.append(Paragraph(f"{school_name} - ID Card", title_style))
        story.append(Spacer(1, 12))
        
        # User details table
        user_data = [
            ['Name:', user.full_name],
            ['Email:', user.email],
            ['Role:', user.role.value.replace('_', ' ').title()],
            ['ID:', data.get('student_id', user.id[:8])],
            ['Issue Date:', datetime.now().strftime('%Y-%m-%d')]
        ]
        
        table = Table(user_data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ]))
        
        story.append(table)
        doc.build(story)
        
        buffer.seek(0)
        pdf_data = base64.b64encode(buffer.read()).decode()
        buffer.close()
        
        return f"data:application/pdf;base64,{pdf_data}"
    
    async def _generate_report_card(self, user: User, data: Dict[str, Any]) -> str:
        """Generate report card document"""
        # Similar implementation for report card
        # This would include grades, subjects, etc.
        return await self._generate_generic_document(DocumentType.REPORT_CARD, user, data)
    
    async def _generate_certificate(self, user: User, data: Dict[str, Any]) -> str:
        """Generate certificate document"""
        # Similar implementation for certificate
        return await self._generate_generic_document(DocumentType.CERTIFICATE, user, data)
    
    async def _generate_generic_document(
        self, 
        doc_type: DocumentType, 
        user: User, 
        data: Dict[str, Any]
    ) -> str:
        """Generate generic document template"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title = f"{doc_type.value.replace('_', ' ').title()}"
        story.append(Paragraph(title, styles['Title']))
        story.append(Spacer(1, 12))
        
        # Content based on template data
        for key, value in data.items():
            content = f"<b>{key.replace('_', ' ').title()}:</b> {value}"
            story.append(Paragraph(content, styles['Normal']))
            story.append(Spacer(1, 6))
        
        doc.build(story)
        
        buffer.seek(0)
        pdf_data = base64.b64encode(buffer.read()).decode()
        buffer.close()
        
        return f"data:application/pdf;base64,{pdf_data}"
    
    async def _get_or_create_conversation(self, user: User, conversation_id: Optional[str]) -> Dict[str, Any]:
        """Get existing conversation or create new one"""
        from .models import AIConversation
        
        if conversation_id:
            conversation = await db_service.get_by_id(AIConversation, conversation_id)
            if conversation and conversation.user_id == user.id:
                return {
                    "id": conversation.id,
                    "messages": conversation.messages or []
                }
        
        # Create new conversation
        conversation = await db_service.create(
            AIConversation,
            user_id=user.id,
            school_id=user.school_id,
            title=f"Conversation {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            messages=[],
            ai_model=settings.AI_MODEL
        )
        
        return {
            "id": conversation.id,
            "messages": []
        }
    
    async def _update_conversation(
        self, 
        conversation_id: str, 
        user_message: str, 
        ai_response: str, 
        user_id: str
    ) -> None:
        """Update conversation with new messages"""
        from .models import AIConversation
        
        conversation = await db_service.get_by_id(AIConversation, conversation_id)
        if not conversation:
            return
        
        # Add new messages
        messages = conversation.messages or []
        messages.extend([
            {
                "role": "user",
                "content": user_message,
                "timestamp": datetime.now().isoformat()
            },
            {
                "role": "assistant",
                "content": ai_response,
                "timestamp": datetime.now().isoformat()
            }
        ])
        
        # Keep only last 50 messages to prevent excessive storage
        if len(messages) > 50:
            messages = messages[-50:]
        
        await db_service.update(
            AIConversation,
            conversation_id,
            messages=messages,
            total_tokens=conversation.total_tokens + len(user_message) + len(ai_response)
        )
    
    async def _get_school_name(self, school_id: Optional[str]) -> str:
        """Get school name for context"""
        if not school_id:
            return "School Nexus Platform"
        
        school = await db_service.get_by_id(School, school_id)
        return school.name if school else "Unknown School"


# Global AI service instance
ai_service = AIService()