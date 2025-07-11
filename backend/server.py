import uvicorn
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile, BackgroundTasks, Request, Header, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, FileResponse, PlainTextResponse
from contextlib import asynccontextmanager
import asyncio
from loguru import logger
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session

# Import our modules
from .config import settings, get_settings
from .database import init_database, close_database, get_db_service, db_service, get_database
from .models import *
from .utils import *
from .ai_service import ai_service
from .bot_service import bot_service

# Configure logging
logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL))
logger.add(
    "logs/school_nexus.log",
    rotation="500 MB",
    retention="30 days",
    level=settings.LOG_LEVEL
)

# Initialize Sentry for error tracking
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,
    )

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

# Security
security = HTTPBearer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Initialize database
    await init_database()
    
    # Initialize AI service if enabled
    if settings.ENABLE_AI_FEATURES:
        try:
            # AI service is already initialized in __init__
            logger.info("AI service initialized")
        except Exception as e:
            logger.warning(f"AI service initialization failed: {e}")
    
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")
    await close_database()
    logger.info("Application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Multi-tenant AI-powered School Management System",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not settings.DEBUG:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Custom exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url)
        }
    )


# Dependencies
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Any = Depends(get_db_service)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    payload = verify_token(token)
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = await db.get_by_id(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Update last login
    await db.update(User, user_id, last_login=datetime.utcnow())
    
    return user


async def get_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require super admin access"""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_user


async def get_school_admin_or_above(current_user: User = Depends(get_current_user)) -> User:
    """Require school admin or super admin access"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.APP_VERSION,
        "database": settings.DATABASE_TYPE
    }


# Setup Wizard Endpoints
@app.get("/api/setup/status")
async def get_setup_status():
    """Check if initial setup is completed"""
    return {"setup_completed": settings.SETUP_COMPLETED}


@app.post("/api/setup/initialize")
async def initialize_system(setup_data: Dict[str, Any]):
    """Initialize system with database and super admin"""
    if settings.SETUP_COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System already initialized"
        )
    
    try:
        # Update database configuration
        db_config = setup_data.get("database", {})
        if db_config:
            # This would typically update environment variables
            # For now, we'll assume the configuration is already set
            pass
        
        # Initialize database
        await init_database()
        
        # Update super admin if provided
        admin_data = setup_data.get("admin", {})
        if admin_data:
            # Update super admin details
            existing_admin = await db_service.get_by_email(User, settings.SUPER_ADMIN_EMAIL)
            if existing_admin:
                await db_service.update(
                    User,
                    existing_admin.id,
                    full_name=admin_data.get("full_name", "Super Administrator"),
                    email=admin_data.get("email", settings.SUPER_ADMIN_EMAIL)
                )
        
        # Mark setup as completed
        # In a real application, this would update a config file or environment
        
        return {"message": "System initialized successfully"}
        
    except Exception as e:
        logger.error(f"Setup initialization failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Setup initialization failed"
        )


# Authentication Endpoints
@app.post("/api/auth/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(
    request,
    credentials: UserLogin,
    db: Any = Depends(get_db_service)
):
    """User login"""
    user = await db.get_by_email(User, credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive"
        )
    
    # Create access token
    token_data = {"user_id": user.id, "role": user.role.value}
    access_token = create_access_token(token_data)
    
    # Create response
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        school_id=user.school_id,
        is_active=user.is_active,
        email_verified=user.email_verified,
        last_login=user.last_login,
        created_at=user.created_at
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        school_id=current_user.school_id,
        is_active=current_user.is_active,
        email_verified=current_user.email_verified,
        last_login=current_user.last_login,
        created_at=current_user.created_at
    )


@app.post("/api/auth/refresh")
async def refresh_token(current_user: User = Depends(get_current_user)):
    """Refresh access token"""
    token_data = {"user_id": current_user.id, "role": current_user.role.value}
    new_token = create_access_token(token_data)
    
    return {"access_token": new_token, "token_type": "bearer"}


# Super Admin Endpoints
@app.get("/api/admin/dashboard", response_model=DashboardStats)
async def get_admin_dashboard(
    current_user: User = Depends(get_super_admin),
    db: Any = Depends(get_db_service)
):
    """Get super admin dashboard statistics"""
    stats = await db.get_school_stats()
    return DashboardStats(**stats)


@app.get("/api/admin/schools", response_model=List[SchoolResponse])
async def get_all_schools(
    current_user: User = Depends(get_super_admin),
    db: Any = Depends(get_db_service)
):
    """Get all schools"""
    schools = await db.get_all(School)
    return [SchoolResponse.from_orm(school) for school in schools]


@app.post("/api/admin/schools", response_model=SchoolResponse)
async def create_school(
    school_data: SchoolCreate,
    current_user: User = Depends(get_super_admin),
    db: Any = Depends(get_db_service)
):
    """Create new school"""
    # Check if school email already exists
    existing_school = await db.get_by_email(School, school_data.email)
    if existing_school:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="School with this email already exists"
        )
    
    # Check if admin email already exists
    existing_admin = await db.get_by_email(User, school_data.admin_email)
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin email already exists"
        )
    
    # Create school
    school = await db.create(
        School,
        name=school_data.name,
        email=school_data.email,
        phone=school_data.phone,
        address=school_data.address,
        subscription_plan=school_data.subscription_plan,
        status=SchoolStatus.ACTIVE
    )
    
    # Create school admin user
    admin_user = await db.create(
        User,
        email=school_data.admin_email,
        password_hash=hash_password(school_data.admin_password),
        full_name=school_data.admin_full_name,
        role=UserRole.SCHOOL_ADMIN,
        school_id=school.id,
        is_active=True,
        email_verified=True
    )
    
    # Update school with admin user ID
    await db.update(School, school.id, admin_user_id=admin_user.id, total_users=1)
    
    return SchoolResponse.from_orm(school)


@app.put("/api/admin/schools/{school_id}", response_model=SchoolResponse)
async def update_school(
    school_id: str,
    school_data: SchoolUpdate,
    current_user: User = Depends(get_super_admin),
    db: Any = Depends(get_db_service)
):
    """Update school"""
    school = await db.get_by_id(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )
    
    # Update school
    updated_school = await db.update(School, school_id, **school_data.dict(exclude_unset=True))
    return SchoolResponse.from_orm(updated_school)


# School Admin Endpoints
@app.get("/api/school/dashboard", response_model=DashboardStats)
async def get_school_dashboard(
    current_user: User = Depends(get_school_admin_or_above),
    db: Any = Depends(get_db_service)
):
    """Get school dashboard statistics"""
    school_id = current_user.school_id if current_user.role != UserRole.SUPER_ADMIN else None
    stats = await db.get_school_stats(school_id)
    return DashboardStats(**stats)


@app.get("/api/school/info", response_model=SchoolResponse)
async def get_school_info(
    current_user: User = Depends(get_school_admin_or_above),
    db: Any = Depends(get_db_service)
):
    """Get school information"""
    if current_user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super admin has no associated school"
        )
    
    school = await db.get_by_id(School, current_user.school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )
    
    return SchoolResponse.from_orm(school)


@app.get("/api/school/users", response_model=List[UserResponse])
async def get_school_users(
    current_user: User = Depends(get_school_admin_or_above),
    db: Any = Depends(get_db_service)
):
    """Get school users"""
    if current_user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super admin cannot access school users directly"
        )
    
    users = await db.get_all(User, school_id=current_user.school_id)
    return [UserResponse.from_orm(user) for user in users]


@app.post("/api/school/users", response_model=UserResponse)
async def create_school_user(
    user_data: UserCreate,
    current_user: User = Depends(get_school_admin_or_above),
    db: Any = Depends(get_db_service)
):
    """Create new school user"""
    # Check if email already exists
    existing_user = await db.get_by_email(User, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create user
    user = await db.create(
        User,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        school_id=current_user.school_id,
        phone=user_data.phone,
        is_active=True
    )
    
    # Update school user count
    school = await db.get_by_id(School, current_user.school_id)
    if school:
        await db.update(School, school.id, total_users=school.total_users + 1)
    
    return UserResponse.from_orm(user)


# AI Endpoints
@app.post("/api/ai/chat", response_model=AIMessageResponse)
@limiter.limit("30/minute")
async def ai_chat(
    request,
    message_data: AIMessageRequest,
    current_user: User = Depends(get_current_user)
):
    """Chat with AI assistant"""
    if not settings.ENABLE_AI_FEATURES:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are disabled"
        )
    
    try:
        response = await ai_service.process_message(
            message=message_data.message,
            user=current_user,
            conversation_id=message_data.conversation_id,
            voice_data=message_data.voice_data
        )
        
        return AIMessageResponse(**response)
        
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service error"
        )


@app.post("/api/ai/voice")
@limiter.limit("10/minute")
async def process_voice(
    request,
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Process voice input"""
    if not settings.ENABLE_VOICE_FEATURES:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voice features are disabled"
        )
    
    try:
        # Read audio data
        audio_data = await audio.read()
        
        # Process with AI service
        response = await ai_service.process_message(
            message="",
            user=current_user,
            voice_data=audio_data
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Voice processing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Voice processing error"
        )


# Document Generation Endpoints
@app.post("/api/documents/generate")
async def generate_document(
    doc_request: DocumentRequest,
    current_user: User = Depends(get_current_user),
    db: Any = Depends(get_db_service)
):
    """Generate document"""
    try:
        # Generate document using AI service
        document_data = await ai_service.generate_document(
            document_type=doc_request.document_type,
            user=current_user,
            template_data=doc_request.template_data
        )
        
        if not document_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Document generation failed"
            )
        
        # Save document record
        document = await db.create(
            Document,
            school_id=current_user.school_id,
            user_id=doc_request.user_id or current_user.id,
            title=doc_request.title,
            document_type=doc_request.document_type,
            template_data=doc_request.template_data,
            file_url=document_data  # Base64 encoded PDF
        )
        
        return {
            "document_id": document.id,
            "document_url": document_data,
            "title": doc_request.title,
            "type": doc_request.document_type.value
        }
        
    except Exception as e:
        logger.error(f"Document generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document generation failed"
        )


# File Upload Endpoints
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload file"""
    try:
        # Validate file
        file_size = len(await file.read())
        await file.seek(0)  # Reset file pointer
        
        validation = FileValidator.validate_document(file.filename, file_size)
        if not validation["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=validation["errors"]
            )
        
        # Generate unique filename
        unique_filename = generate_unique_filename(file.filename, current_user.id)
        
        # Save file (this is a simplified version - in production you'd use cloud storage)
        file_path = f"uploads/{unique_filename}"
        
        # For now, we'll just return the file info
        return {
            "filename": unique_filename,
            "original_filename": file.filename,
            "size": file_size,
            "content_type": file.content_type,
            "upload_url": f"/api/files/{unique_filename}"
        }
        
    except Exception as e:
        logger.error(f"File upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File upload failed"
        )


# Notification Endpoints
@app.post("/api/notifications")
async def create_notification(
    notification_data: NotificationRequest,
    current_user: User = Depends(get_school_admin_or_above),
    db: Any = Depends(get_db_service)
):
    """Create notification"""
    try:
        # Create notification
        notification = await db.create(
            Notification,
            school_id=current_user.school_id,
            title=notification_data.title,
            message=notification_data.message,
            notification_type=notification_data.notification_type,
            role_filter=notification_data.role_filter,
            send_email=notification_data.send_email,
            send_sms=notification_data.send_sms
        )
        
        # TODO: Implement notification delivery
        
        return {"notification_id": notification.id, "status": "created"}
        
    except Exception as e:
        logger.error(f"Notification creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Notification creation failed"
        )


# System Statistics
@app.get("/api/system/stats")
async def get_system_stats(current_user: User = Depends(get_super_admin)):
    """Get system-wide statistics"""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "uptime": "System running",
        "database_type": settings.DATABASE_TYPE,
        "ai_enabled": settings.ENABLE_AI_FEATURES,
        "voice_enabled": settings.ENABLE_VOICE_FEATURES
    }


# Bot Webhook Endpoints
@app.post("/webhook/telegram/{school_id}")
async def telegram_webhook(
    school_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_database)
):
    """Handle Telegram webhook updates"""
    try:
        # Verify school exists
        school = db.query(School).filter(School.id == school_id).first()
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        
        # Parse update data
        update_data = await request.json()
        
        # Process update in background
        background_tasks.add_task(
            bot_service.process_telegram_update, 
            school_id, 
            update_data
        )
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Telegram webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

@app.post("/webhook/whatsapp/{school_id}")
async def whatsapp_webhook(
    school_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: str = Header(None),
    db: Session = Depends(get_database)
):
    """Handle WhatsApp webhook updates"""
    try:
        # Verify school exists
        school = db.query(School).filter(School.id == school_id).first()
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        
        # Get request body
        body = await request.body()
        
        # Verify webhook signature if provided
        if x_hub_signature_256:
            app_secret = settings.WHATSAPP_APP_SECRET
            if not bot_service.verify_whatsapp_webhook(
                body.decode(), x_hub_signature_256, app_secret
            ):
                raise HTTPException(status_code=403, detail="Invalid signature")
        
        # Parse update data
        update_data = await request.json()
        
        # Check if it's a verification request
        if "hub.mode" in update_data and update_data["hub.mode"] == "subscribe":
            verify_token = update_data.get("hub.verify_token")
            if verify_token == settings.WHATSAPP_VERIFY_TOKEN:
                return PlainTextResponse(update_data.get("hub.challenge", ""))
            else:
                raise HTTPException(status_code=403, detail="Invalid verify token")
        
        # Process update in background
        background_tasks.add_task(
            bot_service.process_whatsapp_update,
            school_id,
            update_data
        )
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"WhatsApp webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

@app.get("/webhook/whatsapp/{school_id}")
async def whatsapp_webhook_verify(
    school_id: str,
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
    db: Session = Depends(get_database)
):
    """Verify WhatsApp webhook"""
    try:
        # Verify school exists
        school = db.query(School).filter(School.id == school_id).first()
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        
        if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
            return PlainTextResponse(hub_challenge)
        else:
            raise HTTPException(status_code=403, detail="Invalid verification")
            
    except Exception as e:
        logger.error(f"WhatsApp webhook verification error: {str(e)}")
        raise HTTPException(status_code=500, detail="Verification failed")

# Bot Management Endpoints
@app.post("/api/bots/telegram/register")
async def register_telegram_bot(
    bot_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Register a Telegram bot for a school"""
    try:
        # Verify user permissions
        if current_user.role not in ["super_admin", "school_admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        school_id = bot_data.get("school_id")
        bot_token = bot_data.get("bot_token")
        
        if not school_id or not bot_token:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Verify school access
        if current_user.role == "school_admin" and current_user.school_id != school_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Register bot
        success = bot_service.register_telegram_bot(school_id, bot_token)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to register bot")
        
        # Set webhook
        webhook_url = f"{settings.BASE_URL}/webhook/telegram/{school_id}"
        telegram_bot = bot_service.telegram_bots[school_id]
        await telegram_bot.set_webhook(webhook_url)
        
        # Update school settings
        school = db.query(School).filter(School.id == school_id).first()
        if school:
            school.telegram_bot_token = bot_token
            school.telegram_enabled = True
            db.commit()
        
        return {"message": "Telegram bot registered successfully", "webhook_url": webhook_url}
        
    except Exception as e:
        logger.error(f"Telegram bot registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/api/bots/whatsapp/register")
async def register_whatsapp_bot(
    bot_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Register a WhatsApp bot for a school"""
    try:
        # Verify user permissions
        if current_user.role not in ["super_admin", "school_admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        school_id = bot_data.get("school_id")
        access_token = bot_data.get("access_token")
        phone_number_id = bot_data.get("phone_number_id")
        
        if not all([school_id, access_token, phone_number_id]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Verify school access
        if current_user.role == "school_admin" and current_user.school_id != school_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Register bot
        success = bot_service.register_whatsapp_bot(school_id, access_token, phone_number_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to register bot")
        
        # Update school settings
        school = db.query(School).filter(School.id == school_id).first()
        if school:
            school.whatsapp_access_token = access_token
            school.whatsapp_phone_id = phone_number_id
            school.whatsapp_enabled = True
            db.commit()
        
        webhook_url = f"{settings.BASE_URL}/webhook/whatsapp/{school_id}"
        
        return {
            "message": "WhatsApp bot registered successfully",
            "webhook_url": webhook_url,
            "verify_token": settings.WHATSAPP_VERIFY_TOKEN
        }
        
    except Exception as e:
        logger.error(f"WhatsApp bot registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/api/bots/broadcast")
async def send_broadcast_message(
    broadcast_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Send broadcast message via bots"""
    try:
        # Verify user permissions
        if current_user.role not in ["super_admin", "school_admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        school_id = broadcast_data.get("school_id")
        message = broadcast_data.get("message")
        platform = broadcast_data.get("platform", "both")  # telegram, whatsapp, both
        user_roles = broadcast_data.get("user_roles")  # Optional filter by roles
        
        if not school_id or not message:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Verify school access
        if current_user.role == "school_admin" and current_user.school_id != school_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Send broadcast
        await bot_service.send_broadcast_message(
            school_id, message, platform, user_roles
        )
        
        return {"message": "Broadcast sent successfully"}
        
    except Exception as e:
        logger.error(f"Broadcast error: {str(e)}")
        raise HTTPException(status_code=500, detail="Broadcast failed")

@app.get("/api/bots/status/{school_id}")
async def get_bot_status(
    school_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database)
):
    """Get bot status for a school"""
    try:
        # Verify user permissions
        if current_user.role not in ["super_admin", "school_admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Verify school access
        if current_user.role == "school_admin" and current_user.school_id != school_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get bot status
        telegram_active = school_id in bot_service.telegram_bots
        whatsapp_active = school_id in bot_service.whatsapp_bots
        
        # Get school settings
        school = db.query(School).filter(School.id == school_id).first()
        
        return {
            "telegram": {
                "enabled": school.telegram_enabled if school else False,
                "active": telegram_active,
                "webhook_url": f"{settings.BASE_URL}/webhook/telegram/{school_id}" if telegram_active else None
            },
            "whatsapp": {
                "enabled": school.whatsapp_enabled if school else False,
                "active": whatsapp_active,
                "webhook_url": f"{settings.BASE_URL}/webhook/whatsapp/{school_id}" if whatsapp_active else None
            }
        }
        
    except Exception as e:
        logger.error(f"Bot status error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get status")


if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower()
    )