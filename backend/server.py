from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_SECRET = "school-nexus-secret-key-2024"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    SCHOOL_ADMIN = "school_admin"
    STAFF = "staff"
    STUDENT = "student"
    PARENT = "parent"

class SchoolStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

# Data Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    full_name: str
    role: UserRole
    school_id: Optional[str] = None  # None for super_admin
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class School(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    status: SchoolStatus = SchoolStatus.ACTIVE
    subscription_plan: str = "basic"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    admin_user_id: Optional[str] = None

# Request/Response Models
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: UserRole
    school_id: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    school_id: Optional[str] = None
    is_active: bool
    created_at: datetime

class SchoolCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    admin_full_name: str
    admin_email: str
    admin_password: str

class SchoolResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    status: SchoolStatus
    subscription_plan: str
    created_at: datetime
    admin_user_id: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class DashboardStats(BaseModel):
    total_schools: int = 0
    active_schools: int = 0
    total_users: int = 0
    total_students: int = 0

# Utility Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

# Authentication Dependencies
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user_data = await db.users.find_one({"id": user_id})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return User(**user_data)

async def get_super_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_user

async def get_school_admin(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="School admin access required"
        )
    return current_user

# Initialize Super Admin
async def create_super_admin():
    existing_admin = await db.users.find_one({"role": UserRole.SUPER_ADMIN})
    if not existing_admin:
        super_admin = User(
            email="admin@schoolnexus.com",
            password_hash=hash_password("admin123"),
            full_name="Super Administrator",
            role=UserRole.SUPER_ADMIN,
            school_id=None
        )
        await db.users.insert_one(super_admin.dict())
        logging.info("Super admin created: admin@schoolnexus.com / admin123")

# Auth Routes
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(credentials: UserLogin):
    user_data = await db.users.find_one({"email": credentials.email})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    user = User(**user_data)
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
    
    access_token = create_access_token({"user_id": user.id, "role": user.role})
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        school_id=user.school_id,
        is_active=user.is_active,
        created_at=user.created_at
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        school_id=current_user.school_id,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )

# Super Admin Routes
@api_router.get("/admin/dashboard", response_model=DashboardStats)
async def get_admin_dashboard(current_user: User = Depends(get_super_admin)):
    total_schools = await db.schools.count_documents({})
    active_schools = await db.schools.count_documents({"status": SchoolStatus.ACTIVE})
    total_users = await db.users.count_documents({})
    total_students = await db.users.count_documents({"role": UserRole.STUDENT})
    
    return DashboardStats(
        total_schools=total_schools,
        active_schools=active_schools,
        total_users=total_users,
        total_students=total_students
    )

@api_router.get("/admin/schools", response_model=List[SchoolResponse])
async def get_all_schools(current_user: User = Depends(get_super_admin)):
    schools = await db.schools.find().to_list(1000)
    return [SchoolResponse(**school) for school in schools]

@api_router.post("/admin/schools", response_model=SchoolResponse)
async def create_school(school_data: SchoolCreate, current_user: User = Depends(get_super_admin)):
    # Check if school email already exists
    existing_school = await db.schools.find_one({"email": school_data.email})
    if existing_school:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="School with this email already exists"
        )
    
    # Check if admin email already exists
    existing_admin = await db.users.find_one({"email": school_data.admin_email})
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin email already exists"
        )
    
    # Create school
    school = School(
        name=school_data.name,
        email=school_data.email,
        phone=school_data.phone,
        address=school_data.address
    )
    
    # Create school admin user
    admin_user = User(
        email=school_data.admin_email,
        password_hash=hash_password(school_data.admin_password),
        full_name=school_data.admin_full_name,
        role=UserRole.SCHOOL_ADMIN,
        school_id=school.id
    )
    
    # Save to database
    await db.schools.insert_one(school.dict())
    await db.users.insert_one(admin_user.dict())
    
    # Update school with admin user id
    school.admin_user_id = admin_user.id
    await db.schools.update_one(
        {"id": school.id},
        {"$set": {"admin_user_id": admin_user.id}}
    )
    
    return SchoolResponse(**school.dict())

# School Admin Routes
@api_router.get("/school/dashboard", response_model=DashboardStats)
async def get_school_dashboard(current_user: User = Depends(get_school_admin)):
    school_id = current_user.school_id
    if not school_id:
        # Super admin accessing school dashboard
        return DashboardStats()
    
    total_users = await db.users.count_documents({"school_id": school_id})
    total_students = await db.users.count_documents({"school_id": school_id, "role": UserRole.STUDENT})
    total_staff = await db.users.count_documents({"school_id": school_id, "role": UserRole.STAFF})
    
    return DashboardStats(
        total_schools=1,
        active_schools=1,
        total_users=total_users,
        total_students=total_students
    )

@api_router.get("/school/users", response_model=List[UserResponse])
async def get_school_users(current_user: User = Depends(get_school_admin)):
    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="School access required"
        )
    
    users = await db.users.find({"school_id": school_id}).to_list(1000)
    return [UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        school_id=user["school_id"],
        is_active=user["is_active"],
        created_at=user["created_at"]
    ) for user in users]

@api_router.get("/school/info", response_model=SchoolResponse)
async def get_school_info(current_user: User = Depends(get_school_admin)):
    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="School access required"
        )
    
    school_data = await db.schools.find_one({"id": school_id})
    if not school_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )
    
    return SchoolResponse(**school_data)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await create_super_admin()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()