import asyncio
from typing import AsyncGenerator, Optional, Type, TypeVar, List
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update, delete, and_, or_, func, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from motor.motor_asyncio import AsyncIOMotorClient
from supabase import create_client, Client
import logging
from contextlib import asynccontextmanager

from .config import settings
from .models import Base, School, User, UserRole, SchoolStatus
from .utils import hash_password

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=Base)


class DatabaseService:
    """
    Unified database service that supports multiple database backends
    """
    
    def __init__(self):
        self.engine = None
        self.async_session = None
        self.mongo_client = None
        self.mongo_db = None
        self.supabase = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize database connection based on configuration"""
        if self._initialized:
            return
        
        try:
            if settings.DATABASE_TYPE in ["postgresql", "mysql"]:
                await self._init_sql_database()
            elif settings.DATABASE_TYPE == "supabase":
                await self._init_supabase()
            elif settings.DATABASE_TYPE == "mongodb":
                await self._init_mongodb()
            else:
                raise ValueError(f"Unsupported database type: {settings.DATABASE_TYPE}")
            
            self._initialized = True
            logger.info(f"Database initialized: {settings.DATABASE_TYPE}")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    async def _init_sql_database(self):
        """Initialize PostgreSQL or MySQL connection"""
        database_url = settings.database_url
        
        # Create async engine
        self.engine = create_async_engine(
            database_url,
            echo=settings.ENABLE_DB_LOGS,
            pool_size=20,
            max_overflow=30,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        
        # Create session factory
        self.async_session = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        # Create tables
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    async def _init_supabase(self):
        """Initialize Supabase connection"""
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("Supabase URL and Key are required")
        
        self.supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        
        # Also initialize SQL connection for complex queries
        if settings.SUPABASE_SERVICE_KEY:
            # Use service key for direct database access
            database_url = settings.database_url
            if database_url:
                await self._init_sql_database()
    
    async def _init_mongodb(self):
        """Initialize MongoDB connection (legacy support)"""
        if not settings.MONGO_URL:
            raise ValueError("MongoDB URL is required")
        
        self.mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
        self.mongo_db = self.mongo_client[settings.MONGO_DB_NAME]
        
        # Test connection
        await self.mongo_client.admin.command('ping')
        
        # Create indexes
        await self._create_mongo_indexes()
    
    async def _create_mongo_indexes(self):
        """Create MongoDB indexes for better performance"""
        try:
            # Users collection indexes
            await self.mongo_db.users.create_index("email", unique=True)
            await self.mongo_db.users.create_index([("school_id", 1), ("role", 1)])
            
            # Schools collection indexes
            await self.mongo_db.schools.create_index("email", unique=True)
            await self.mongo_db.schools.create_index("status")
            
            logger.info("MongoDB indexes created successfully")
        except Exception as e:
            logger.warning(f"Failed to create MongoDB indexes: {e}")
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session"""
        if not self._initialized:
            await self.initialize()
        
        if settings.DATABASE_TYPE in ["postgresql", "mysql", "supabase"]:
            async with self.async_session() as session:
                try:
                    yield session
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
                finally:
                    await session.close()
        else:
            # For MongoDB, return a mock session
            yield None
    
    async def create(self, model_class: Type[T], **kwargs) -> T:
        """Create a new record"""
        if settings.DATABASE_TYPE == "mongodb":
            return await self._mongo_create(model_class, **kwargs)
        else:
            return await self._sql_create(model_class, **kwargs)
    
    async def get_by_id(self, model_class: Type[T], id: str) -> Optional[T]:
        """Get record by ID"""
        if settings.DATABASE_TYPE == "mongodb":
            return await self._mongo_get_by_id(model_class, id)
        else:
            return await self._sql_get_by_id(model_class, id)
    
    async def get_by_email(self, model_class: Type[T], email: str) -> Optional[T]:
        """Get record by email"""
        if settings.DATABASE_TYPE == "mongodb":
            return await self._mongo_get_by_email(model_class, email)
        else:
            return await self._sql_get_by_email(model_class, email)
    
    async def get_all(self, model_class: Type[T], **filters) -> List[T]:
        """Get all records with optional filters"""
        if settings.DATABASE_TYPE == "mongodb":
            return await self._mongo_get_all(model_class, **filters)
        else:
            return await self._sql_get_all(model_class, **filters)
    
    async def update(self, model_class: Type[T], id: str, **kwargs) -> Optional[T]:
        """Update record"""
        if settings.DATABASE_TYPE == "mongodb":
            return await self._mongo_update(model_class, id, **kwargs)
        else:
            return await self._sql_update(model_class, id, **kwargs)
    
    async def delete(self, model_class: Type[T], id: str) -> bool:
        """Delete record"""
        if settings.DATABASE_TYPE == "mongodb":
            return await self._mongo_delete(model_class, id)
        else:
            return await self._sql_delete(model_class, id)
    
    # SQL Database Operations
    async def _sql_create(self, model_class: Type[T], **kwargs) -> T:
        async with self.get_session() as session:
            instance = model_class(**kwargs)
            session.add(instance)
            await session.flush()
            await session.refresh(instance)
            return instance
    
    async def _sql_get_by_id(self, model_class: Type[T], id: str) -> Optional[T]:
        async with self.get_session() as session:
            result = await session.execute(select(model_class).where(model_class.id == id))
            return result.scalar_one_or_none()
    
    async def _sql_get_by_email(self, model_class: Type[T], email: str) -> Optional[T]:
        async with self.get_session() as session:
            result = await session.execute(select(model_class).where(model_class.email == email))
            return result.scalar_one_or_none()
    
    async def _sql_get_all(self, model_class: Type[T], **filters) -> List[T]:
        async with self.get_session() as session:
            query = select(model_class)
            
            for key, value in filters.items():
                if hasattr(model_class, key):
                    query = query.where(getattr(model_class, key) == value)
            
            result = await session.execute(query)
            return list(result.scalars().all())
    
    async def _sql_update(self, model_class: Type[T], id: str, **kwargs) -> Optional[T]:
        async with self.get_session() as session:
            # Remove None values
            kwargs = {k: v for k, v in kwargs.items() if v is not None}
            
            if not kwargs:
                return await self._sql_get_by_id(model_class, id)
            
            # Add updated_at if the model has it
            if hasattr(model_class, 'updated_at'):
                kwargs['updated_at'] = func.now()
            
            await session.execute(
                update(model_class).where(model_class.id == id).values(**kwargs)
            )
            
            return await self._sql_get_by_id(model_class, id)
    
    async def _sql_delete(self, model_class: Type[T], id: str) -> bool:
        async with self.get_session() as session:
            result = await session.execute(
                delete(model_class).where(model_class.id == id)
            )
            return result.rowcount > 0
    
    # MongoDB Operations (Legacy Support)
    async def _mongo_create(self, model_class: Type[T], **kwargs):
        collection_name = model_class.__tablename__
        collection = getattr(self.mongo_db, collection_name)
        
        # Add ID if not present
        if 'id' not in kwargs:
            import uuid
            kwargs['id'] = str(uuid.uuid4())
        
        # Add timestamps
        from datetime import datetime
        kwargs['created_at'] = datetime.utcnow()
        kwargs['updated_at'] = datetime.utcnow()
        
        await collection.insert_one(kwargs)
        return model_class(**kwargs)
    
    async def _mongo_get_by_id(self, model_class: Type[T], id: str):
        collection_name = model_class.__tablename__
        collection = getattr(self.mongo_db, collection_name)
        
        doc = await collection.find_one({"id": id})
        return model_class(**doc) if doc else None
    
    async def _mongo_get_by_email(self, model_class: Type[T], email: str):
        collection_name = model_class.__tablename__
        collection = getattr(self.mongo_db, collection_name)
        
        doc = await collection.find_one({"email": email})
        return model_class(**doc) if doc else None
    
    async def _mongo_get_all(self, model_class: Type[T], **filters):
        collection_name = model_class.__tablename__
        collection = getattr(self.mongo_db, collection_name)
        
        cursor = collection.find(filters)
        docs = await cursor.to_list(1000)
        return [model_class(**doc) for doc in docs]
    
    async def _mongo_update(self, model_class: Type[T], id: str, **kwargs):
        collection_name = model_class.__tablename__
        collection = getattr(self.mongo_db, collection_name)
        
        # Remove None values
        kwargs = {k: v for k, v in kwargs.items() if v is not None}
        
        if not kwargs:
            return await self._mongo_get_by_id(model_class, id)
        
        # Add updated_at
        from datetime import datetime
        kwargs['updated_at'] = datetime.utcnow()
        
        await collection.update_one(
            {"id": id},
            {"$set": kwargs}
        )
        
        return await self._mongo_get_by_id(model_class, id)
    
    async def _mongo_delete(self, model_class: Type[T], id: str) -> bool:
        collection_name = model_class.__tablename__
        collection = getattr(self.mongo_db, collection_name)
        
        result = await collection.delete_one({"id": id})
        return result.deleted_count > 0
    
    # Specialized queries
    async def get_school_stats(self, school_id: Optional[str] = None) -> dict:
        """Get statistics for a school or all schools"""
        if settings.DATABASE_TYPE == "mongodb":
            return await self._mongo_get_school_stats(school_id)
        else:
            return await self._sql_get_school_stats(school_id)
    
    async def _sql_get_school_stats(self, school_id: Optional[str] = None) -> dict:
        async with self.get_session() as session:
            if school_id:
                # School-specific stats
                user_count = await session.scalar(
                    select(func.count(User.id)).where(User.school_id == school_id)
                )
                student_count = await session.scalar(
                    select(func.count(User.id)).where(
                        and_(User.school_id == school_id, User.role == UserRole.STUDENT)
                    )
                )
                staff_count = await session.scalar(
                    select(func.count(User.id)).where(
                        and_(User.school_id == school_id, User.role == UserRole.STAFF)
                    )
                )
                
                return {
                    "total_users": user_count or 0,
                    "total_students": student_count or 0,
                    "total_staff": staff_count or 0,
                    "total_schools": 1
                }
            else:
                # Global stats
                school_count = await session.scalar(select(func.count(School.id)))
                active_schools = await session.scalar(
                    select(func.count(School.id)).where(School.status == SchoolStatus.ACTIVE)
                )
                user_count = await session.scalar(select(func.count(User.id)))
                student_count = await session.scalar(
                    select(func.count(User.id)).where(User.role == UserRole.STUDENT)
                )
                
                return {
                    "total_schools": school_count or 0,
                    "active_schools": active_schools or 0,
                    "total_users": user_count or 0,
                    "total_students": student_count or 0
                }
    
    async def _mongo_get_school_stats(self, school_id: Optional[str] = None) -> dict:
        if school_id:
            # School-specific stats
            user_count = await self.mongo_db.users.count_documents({"school_id": school_id})
            student_count = await self.mongo_db.users.count_documents({
                "school_id": school_id, 
                "role": UserRole.STUDENT.value
            })
            staff_count = await self.mongo_db.users.count_documents({
                "school_id": school_id, 
                "role": UserRole.STAFF.value
            })
            
            return {
                "total_users": user_count,
                "total_students": student_count,
                "total_staff": staff_count,
                "total_schools": 1
            }
        else:
            # Global stats
            school_count = await self.mongo_db.schools.count_documents({})
            active_schools = await self.mongo_db.schools.count_documents({
                "status": SchoolStatus.ACTIVE.value
            })
            user_count = await self.mongo_db.users.count_documents({})
            student_count = await self.mongo_db.users.count_documents({
                "role": UserRole.STUDENT.value
            })
            
            return {
                "total_schools": school_count,
                "active_schools": active_schools,
                "total_users": user_count,
                "total_students": student_count
            }
    
    async def create_super_admin(self) -> bool:
        """Create the initial super admin user"""
        try:
            # Check if super admin already exists
            existing_admin = await self.get_by_email(User, settings.SUPER_ADMIN_EMAIL)
            if existing_admin:
                logger.info("Super admin already exists")
                return False
            
            # Create super admin
            super_admin_data = {
                "email": settings.SUPER_ADMIN_EMAIL,
                "password_hash": hash_password(settings.SUPER_ADMIN_PASSWORD),
                "full_name": "Super Administrator",
                "role": UserRole.SUPER_ADMIN,
                "school_id": None,
                "is_active": True,
                "email_verified": True
            }
            
            await self.create(User, **super_admin_data)
            logger.info(f"Super admin created: {settings.SUPER_ADMIN_EMAIL}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create super admin: {e}")
            return False
    
    async def close(self):
        """Close database connections"""
        try:
            if self.engine:
                await self.engine.dispose()
            if self.mongo_client:
                self.mongo_client.close()
            logger.info("Database connections closed")
        except Exception as e:
            logger.error(f"Error closing database connections: {e}")


# Global database service instance
db_service = DatabaseService()


async def get_db_service() -> DatabaseService:
    """Dependency to get database service"""
    if not db_service._initialized:
        await db_service.initialize()
    return db_service


async def init_database():
    """Initialize database and create super admin"""
    await db_service.initialize()
    await db_service.create_super_admin()


async def close_database():
    """Close database connections"""
    await db_service.close()