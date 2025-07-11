import bcrypt
import jwt
import secrets
import qrcode
import pyotp
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union
from passlib.context import CryptContext
from jose import JWTError
from fastapi import HTTPException, status
from io import BytesIO
import base64
import hashlib
import re
import logging
from PIL import Image

from .config import settings

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def generate_password(length: int = 12) -> str:
    """Generate a secure random password"""
    import string
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    
    try:
        encoded_jwt = jwt.encode(
            to_encode, 
            settings.JWT_SECRET_KEY, 
            algorithm=settings.JWT_ALGORITHM
        )
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error creating access token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create access token"
        )


def verify_token(token: str) -> Dict[str, Any]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


def create_refresh_token(user_id: str) -> str:
    """Create refresh token"""
    data = {"sub": user_id, "type": "refresh"}
    expires_delta = timedelta(days=30)  # Refresh tokens last 30 days
    return create_access_token(data, expires_delta)


def generate_two_fa_secret() -> str:
    """Generate a secret for two-factor authentication"""
    return pyotp.random_base32()


def generate_two_fa_qr_code(email: str, secret: str) -> str:
    """Generate QR code for two-factor authentication setup"""
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=email,
        issuer_name=settings.APP_NAME
    )
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    # Create QR code image
    qr_image = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 string
    buffer = BytesIO()
    qr_image.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{qr_base64}"


def verify_two_fa_token(secret: str, token: str) -> bool:
    """Verify two-factor authentication token"""
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password_strength(password: str) -> Dict[str, Any]:
    """Validate password strength"""
    errors = []
    score = 0
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    else:
        score += 1
    
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    else:
        score += 1
    
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    else:
        score += 1
    
    if not re.search(r'\d', password):
        errors.append("Password must contain at least one digit")
    else:
        score += 1
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errors.append("Password must contain at least one special character")
    else:
        score += 1
    
    strength_levels = ["Very Weak", "Weak", "Fair", "Good", "Strong"]
    strength = strength_levels[min(score, 4)]
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "strength": strength,
        "score": score
    }


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage"""
    # Remove or replace dangerous characters
    filename = re.sub(r'[^\w\s-.]', '', filename)
    filename = re.sub(r'[-\s]+', '-', filename)
    return filename.strip('.-')


def generate_unique_filename(original_filename: str, user_id: str) -> str:
    """Generate unique filename with timestamp and user ID"""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    name, ext = original_filename.rsplit('.', 1) if '.' in original_filename else (original_filename, '')
    
    safe_name = sanitize_filename(name)
    unique_id = secrets.token_hex(8)
    
    if ext:
        return f"{safe_name}_{timestamp}_{user_id[:8]}_{unique_id}.{ext}"
    else:
        return f"{safe_name}_{timestamp}_{user_id[:8]}_{unique_id}"


def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f} {size_names[i]}"


def validate_file_type(filename: str, allowed_types: list) -> bool:
    """Validate file type based on extension"""
    if not filename:
        return False
    
    ext = filename.lower().split('.')[-1] if '.' in filename else ''
    return ext in [t.lower() for t in allowed_types]


def generate_student_id(school_id: str, admission_year: int) -> str:
    """Generate unique student ID"""
    year_suffix = str(admission_year)[-2:]  # Last 2 digits of year
    school_prefix = school_id[:3].upper()   # First 3 chars of school ID
    random_suffix = secrets.token_hex(3).upper()  # Random 6 chars
    
    return f"{school_prefix}{year_suffix}{random_suffix}"


def generate_employee_id(school_id: str) -> str:
    """Generate unique employee ID"""
    school_prefix = school_id[:3].upper()
    timestamp = datetime.utcnow().strftime("%m%d")
    random_suffix = secrets.token_hex(2).upper()
    
    return f"EMP{school_prefix}{timestamp}{random_suffix}"


def mask_sensitive_data(data: str, mask_char: str = "*", visible_chars: int = 4) -> str:
    """Mask sensitive data like phone numbers, emails"""
    if len(data) <= visible_chars:
        return mask_char * len(data)
    
    if "@" in data:  # Email
        username, domain = data.split("@", 1)
        masked_username = username[:2] + mask_char * (len(username) - 2)
        return f"{masked_username}@{domain}"
    else:  # Phone or other
        visible = data[-visible_chars:]
        masked = mask_char * (len(data) - visible_chars)
        return masked + visible


def generate_api_key(length: int = 32) -> str:
    """Generate API key"""
    return secrets.token_urlsafe(length)


def hash_api_key(api_key: str) -> str:
    """Hash API key for storage"""
    return hashlib.sha256(api_key.encode()).hexdigest()


def verify_api_key(api_key: str, hashed_key: str) -> bool:
    """Verify API key against hash"""
    return hash_api_key(api_key) == hashed_key


def generate_invitation_token(email: str, role: str, school_id: str) -> str:
    """Generate invitation token for new users"""
    data = {
        "email": email,
        "role": role,
        "school_id": school_id,
        "type": "invitation"
    }
    expires_delta = timedelta(days=7)  # Invitation expires in 7 days
    return create_access_token(data, expires_delta)


def verify_invitation_token(token: str) -> Dict[str, Any]:
    """Verify invitation token"""
    payload = verify_token(token)
    
    if payload.get("type") != "invitation":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invitation token"
        )
    
    return payload


def create_password_reset_token(user_id: str) -> str:
    """Create password reset token"""
    data = {"user_id": user_id, "type": "password_reset"}
    expires_delta = timedelta(hours=1)  # Reset token expires in 1 hour
    return create_access_token(data, expires_delta)


def verify_password_reset_token(token: str) -> str:
    """Verify password reset token and return user ID"""
    payload = verify_token(token)
    
    if payload.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )
    
    return payload.get("user_id")


def generate_otp(length: int = 6) -> str:
    """Generate numeric OTP"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(length)])


def is_expired(timestamp: datetime, hours: int = 24) -> bool:
    """Check if timestamp is expired"""
    return datetime.utcnow() - timestamp > timedelta(hours=hours)


def get_client_ip(request) -> str:
    """Get client IP address from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host


def rate_limit_key(user_id: str, endpoint: str) -> str:
    """Generate rate limit key"""
    return f"rate_limit:{user_id}:{endpoint}"


def generate_school_subdomain(school_name: str) -> str:
    """Generate subdomain from school name"""
    # Convert to lowercase and replace spaces/special chars with hyphens
    subdomain = re.sub(r'[^\w\s-]', '', school_name.lower())
    subdomain = re.sub(r'[-\s]+', '-', subdomain)
    subdomain = subdomain.strip('-')
    
    # Add random suffix to ensure uniqueness
    random_suffix = secrets.token_hex(3)
    return f"{subdomain}-{random_suffix}"


def validate_phone_number(phone: str) -> bool:
    """Validate phone number format"""
    # Basic international phone number validation
    pattern = r'^\+?[1-9]\d{1,14}$'
    return re.match(pattern, phone.replace(' ', '').replace('-', '')) is not None


def format_phone_number(phone: str) -> str:
    """Format phone number consistently"""
    # Remove all non-digit characters except +
    cleaned = re.sub(r'[^\d+]', '', phone)
    
    # Add + if not present and number is international
    if not cleaned.startswith('+') and len(cleaned) > 10:
        cleaned = '+' + cleaned
    
    return cleaned


def calculate_age(birth_date: datetime) -> int:
    """Calculate age from birth date"""
    today = datetime.utcnow().date()
    birth_date = birth_date.date() if isinstance(birth_date, datetime) else birth_date
    
    age = today.year - birth_date.year
    
    # Check if birthday hasn't occurred this year
    if today < birth_date.replace(year=today.year):
        age -= 1
    
    return age


def generate_verification_code(length: int = 6) -> str:
    """Generate alphanumeric verification code"""
    import string
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def mask_email(email: str) -> str:
    """Mask email for privacy"""
    if '@' not in email:
        return email
    
    username, domain = email.split('@', 1)
    
    if len(username) <= 2:
        masked_username = '*' * len(username)
    else:
        masked_username = username[0] + '*' * (len(username) - 2) + username[-1]
    
    return f"{masked_username}@{domain}"


def create_audit_log_entry(
    action: str,
    user_id: str,
    school_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, Any]:
    """Create standardized audit log entry"""
    return {
        "action": action,
        "user_id": user_id,
        "school_id": school_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details or {},
        "ip_address": ip_address,
        "user_agent": user_agent,
        "timestamp": datetime.utcnow().isoformat(),
        "request_id": secrets.token_hex(16)
    }


class PasswordValidator:
    """Password validation utility class"""
    
    @staticmethod
    def is_common_password(password: str) -> bool:
        """Check if password is in common passwords list"""
        common_passwords = [
            "password", "123456", "password123", "admin", "qwerty",
            "letmein", "welcome", "monkey", "dragon", "password1"
        ]
        return password.lower() in common_passwords
    
    @staticmethod
    def has_repeated_chars(password: str, max_repeated: int = 3) -> bool:
        """Check if password has too many repeated characters"""
        for i in range(len(password) - max_repeated + 1):
            if len(set(password[i:i + max_repeated])) == 1:
                return True
        return False
    
    @staticmethod
    def has_sequential_chars(password: str, max_sequential: int = 3) -> bool:
        """Check if password has sequential characters"""
        sequences = [
            "abcdefghijklmnopqrstuvwxyz",
            "0123456789",
            "qwertyuiop",
            "asdfghjkl",
            "zxcvbnm"
        ]
        
        password_lower = password.lower()
        for sequence in sequences:
            for i in range(len(sequence) - max_sequential + 1):
                if sequence[i:i + max_sequential] in password_lower:
                    return True
        return False


class FileValidator:
    """File validation utility class"""
    
    ALLOWED_IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    ALLOWED_DOCUMENT_TYPES = ['pdf', 'doc', 'docx', 'txt', 'rtf']
    ALLOWED_SPREADSHEET_TYPES = ['xls', 'xlsx', 'csv']
    ALLOWED_PRESENTATION_TYPES = ['ppt', 'pptx']
    
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
    
    @classmethod
    def validate_image(cls, filename: str, size: int) -> Dict[str, Any]:
        """Validate image file"""
        errors = []
        
        if not validate_file_type(filename, cls.ALLOWED_IMAGE_TYPES):
            errors.append(f"File type not allowed. Allowed types: {', '.join(cls.ALLOWED_IMAGE_TYPES)}")
        
        if size > cls.MAX_IMAGE_SIZE:
            errors.append(f"File size too large. Maximum size: {format_file_size(cls.MAX_IMAGE_SIZE)}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    @classmethod
    def validate_document(cls, filename: str, size: int) -> Dict[str, Any]:
        """Validate document file"""
        errors = []
        
        allowed_types = (cls.ALLOWED_DOCUMENT_TYPES + 
                        cls.ALLOWED_SPREADSHEET_TYPES + 
                        cls.ALLOWED_PRESENTATION_TYPES)
        
        if not validate_file_type(filename, allowed_types):
            errors.append(f"File type not allowed. Allowed types: {', '.join(allowed_types)}")
        
        if size > cls.MAX_FILE_SIZE:
            errors.append(f"File size too large. Maximum size: {format_file_size(cls.MAX_FILE_SIZE)}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }