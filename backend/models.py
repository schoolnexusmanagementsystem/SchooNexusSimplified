from sqlalchemy import (
    Column, String, Integer, DateTime, Boolean, Text, ForeignKey, 
    Enum, JSON, Float, LargeBinary, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from enum import Enum as PyEnum
import uuid
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


Base = declarative_base()


# Enums
class UserRole(PyEnum):
    SUPER_ADMIN = "super_admin"
    SCHOOL_ADMIN = "school_admin"
    STAFF = "staff"
    STUDENT = "student"
    PARENT = "parent"
    VISITOR = "visitor"


class SchoolStatus(PyEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    TRIAL = "trial"


class SubscriptionPlan(PyEnum):
    FREE = "free"
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class DocumentType(PyEnum):
    ID_CARD = "id_card"
    REPORT_CARD = "report_card"
    EXAM_CARD = "exam_card"
    ADMISSION_LETTER = "admission_letter"
    CERTIFICATE = "certificate"
    TRANSCRIPT = "transcript"


class NotificationType(PyEnum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


# Database Models
class School(Base):
    __tablename__ = "schools"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50))
    address = Column(Text)
    logo_url = Column(String(500))
    website = Column(String(255))
    
    # Status and subscription
    status = Column(Enum(SchoolStatus), default=SchoolStatus.ACTIVE)
    subscription_plan = Column(Enum(SubscriptionPlan), default=SubscriptionPlan.FREE)
    subscription_expires_at = Column(DateTime)
    
    # Settings
    settings = Column(JSON, default=dict)
    branding = Column(JSON, default=dict)  # Colors, fonts, etc.
    
    # Academic year info
    academic_year_start = Column(DateTime)
    academic_year_end = Column(DateTime)
    current_term = Column(String(50))
    
    # Integration settings
    telegram_bot_token = Column(String(500))
    whatsapp_number = Column(String(50))
    ai_enabled = Column(Boolean, default=True)
    
    # Usage tracking
    total_users = Column(Integer, default=0)
    storage_used_mb = Column(Float, default=0.0)
    api_calls_this_month = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="school", cascade="all, delete-orphan")
    classes = relationship("SchoolClass", back_populates="school", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="school", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="school", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_school_email', 'email'),
        Index('idx_school_status', 'status'),
    )


class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    
    # School association (None for super_admin)
    school_id = Column(String(36), ForeignKey("schools.id", ondelete="CASCADE"))
    
    # Profile information
    phone = Column(String(50))
    avatar_url = Column(String(500))
    date_of_birth = Column(DateTime)
    address = Column(Text)
    
    # Student-specific fields
    student_id = Column(String(50))  # School-specific student ID
    admission_number = Column(String(50))
    class_id = Column(String(36), ForeignKey("school_classes.id"))
    parent_contact = Column(String(255))
    
    # Staff-specific fields
    employee_id = Column(String(50))
    department = Column(String(100))
    position = Column(String(100))
    salary = Column(Float)
    hire_date = Column(DateTime)
    
    # Account status
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    last_login = Column(DateTime)
    
    # Preferences
    preferences = Column(JSON, default=dict)
    notification_settings = Column(JSON, default=dict)
    
    # Two-factor authentication
    two_fa_enabled = Column(Boolean, default=False)
    two_fa_secret = Column(String(255))
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    school = relationship("School", back_populates="users")
    school_class = relationship("SchoolClass", back_populates="students")
    ai_conversations = relationship("AIConversation", back_populates="user")
    documents = relationship("Document", back_populates="user")
    
    # Indexes
    __table_args__ = (
        Index('idx_user_email', 'email'),
        Index('idx_user_school_role', 'school_id', 'role'),
        Index('idx_user_student_id', 'school_id', 'student_id'),
    )


class SchoolClass(Base):
    __tablename__ = "school_classes"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(100), nullable=False)  # e.g., "Grade 10A"
    grade_level = Column(String(50))  # e.g., "10"
    section = Column(String(10))  # e.g., "A"
    
    # Class teacher
    class_teacher_id = Column(String(36), ForeignKey("users.id"))
    
    # Academic info
    academic_year = Column(String(20))
    max_students = Column(Integer, default=30)
    room_number = Column(String(20))
    
    # Schedule
    schedule = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    school = relationship("School", back_populates="classes")
    students = relationship("User", back_populates="school_class")
    class_teacher = relationship("User", foreign_keys=[class_teacher_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_class_school', 'school_id'),
        Index('idx_class_grade', 'school_id', 'grade_level'),
    )


class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(100), nullable=False)
    code = Column(String(20))  # Subject code
    description = Column(Text)
    
    # Subject details
    grade_levels = Column(JSON, default=list)  # Which grades this subject is for
    is_core = Column(Boolean, default=False)  # Core or elective
    credit_hours = Column(Integer, default=1)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    school = relationship("School", back_populates="subjects")
    
    # Indexes
    __table_args__ = (
        Index('idx_subject_school', 'school_id'),
        Index('idx_subject_code', 'school_id', 'code'),
    )


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    
    # Document info
    title = Column(String(255), nullable=False)
    document_type = Column(Enum(DocumentType), nullable=False)
    file_path = Column(String(500))
    file_url = Column(String(500))
    file_size = Column(Integer)  # in bytes
    mime_type = Column(String(100))
    
    # Template info (for generated documents)
    template_id = Column(String(36))
    template_data = Column(JSON, default=dict)
    
    # Metadata
    tags = Column(JSON, default=list)
    is_public = Column(Boolean, default=False)
    is_template = Column(Boolean, default=False)
    
    # Version control
    version = Column(Integer, default=1)
    parent_document_id = Column(String(36))
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    school = relationship("School", back_populates="documents")
    user = relationship("User", back_populates="documents")
    
    # Indexes
    __table_args__ = (
        Index('idx_document_school', 'school_id'),
        Index('idx_document_user', 'user_id'),
        Index('idx_document_type', 'school_id', 'document_type'),
    )


class AIConversation(Base):
    __tablename__ = "ai_conversations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Conversation info
    title = Column(String(255))
    messages = Column(JSON, default=list)  # Array of message objects
    
    # AI settings
    ai_model = Column(String(50), default="gpt-4")
    system_prompt = Column(Text)
    
    # Metadata
    total_tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    school = relationship("School")
    user = relationship("User", back_populates="ai_conversations")
    
    # Indexes
    __table_args__ = (
        Index('idx_conversation_school_user', 'school_id', 'user_id'),
        Index('idx_conversation_created', 'created_at'),
    )


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id", ondelete="CASCADE"))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    
    # Notification content
    title = Column(String(255), nullable=False)
    message = Column(Text)
    notification_type = Column(Enum(NotificationType), default=NotificationType.INFO)
    
    # Targeting
    role_filter = Column(JSON, default=list)  # Which roles to send to
    class_filter = Column(JSON, default=list)  # Which classes to send to
    
    # Status
    is_read = Column(Boolean, default=False)
    is_sent = Column(Boolean, default=False)
    
    # Delivery channels
    send_email = Column(Boolean, default=False)
    send_sms = Column(Boolean, default=False)
    send_push = Column(Boolean, default=True)
    
    # Timestamps
    sent_at = Column(DateTime)
    read_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_notification_user', 'user_id'),
        Index('idx_notification_school', 'school_id'),
        Index('idx_notification_unread', 'user_id', 'is_read'),
    )


class SystemLog(Base):
    __tablename__ = "system_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id", ondelete="CASCADE"))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    
    # Log info
    action = Column(String(100), nullable=False)  # login, create_user, etc.
    entity_type = Column(String(50))  # user, school, document, etc.
    entity_id = Column(String(36))
    
    # Request info
    ip_address = Column(String(45))  # Support IPv6
    user_agent = Column(Text)
    request_id = Column(String(36))
    
    # Details
    details = Column(JSON, default=dict)
    status = Column(String(20), default="success")  # success, error, warning
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_log_school', 'school_id'),
        Index('idx_log_user', 'user_id'),
        Index('idx_log_action', 'action'),
        Index('idx_log_created', 'created_at'),
    )


# Pydantic Models for API
class SchoolBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None


class SchoolCreate(SchoolBase):
    admin_full_name: str
    admin_email: str
    admin_password: str
    subscription_plan: SubscriptionPlan = SubscriptionPlan.FREE


class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    status: Optional[SchoolStatus] = None
    subscription_plan: Optional[SubscriptionPlan] = None


class SchoolResponse(SchoolBase):
    id: str
    status: SchoolStatus
    subscription_plan: SubscriptionPlan
    total_users: int
    storage_used_mb: float
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    password: str
    school_id: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


class UserResponse(UserBase):
    id: str
    school_id: Optional[str] = None
    is_active: bool
    email_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class AIMessageRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    voice_data: Optional[bytes] = None


class AIMessageResponse(BaseModel):
    response: str
    conversation_id: str
    response_type: str = "text"  # text, table, chart, document
    metadata: Dict[str, Any] = {}


class DocumentRequest(BaseModel):
    title: str
    document_type: DocumentType
    template_data: Dict[str, Any] = {}
    user_id: Optional[str] = None


class NotificationRequest(BaseModel):
    title: str
    message: str
    notification_type: NotificationType = NotificationType.INFO
    role_filter: List[UserRole] = []
    send_email: bool = False
    send_sms: bool = False