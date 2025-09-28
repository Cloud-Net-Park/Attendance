from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import hashlib
from jose import JWTError, jwt
import os
import uuid
import qrcode
import io
import base64
import random
import string
import smtplib
import logging
from pathlib import Path
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing - Simple hash for demo purposes
security = HTTPBearer()

# Create FastAPI app
app = FastAPI(title="QR Attendance System")
api_router = APIRouter(prefix="/api")

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- MODELS ---
class UserRole:
    SUPERADMIN = "superadmin"
    SUBADMIN = "subadmin"
    CLASS_TEACHER = "class_teacher"
    SUB_TEACHER = "sub_teacher"
    STUDENT = "student"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    username: str
    role: str
    department_id: Optional[str] = None
    class_id: Optional[str] = None
    roll_no: Optional[str] = None
    working_time: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: str
    department_id: Optional[str] = None
    class_id: Optional[str] = None
    roll_no: Optional[str] = None
    working_time: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class StudentLogin(BaseModel):
    roll_no: str
    email: EmailStr

class Department(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class Class(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    department_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class Schedule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    class_id: str
    teacher_id: str
    subject: str
    start_time: str
    end_time: str
    day_of_week: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QRSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    class_id: str
    teacher_id: str
    subject: str
    qr_code: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OTPRequest(BaseModel):
    student_id: str
    qr_session_id: str
    otp: str
    expires_at: datetime
    verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Attendance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    class_id: str
    teacher_id: str
    subject: str
    date: datetime
    status: str = "present"
    qr_session_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class QRCodeResponse(BaseModel):
    qr_code_base64: str
    session_id: str
    expires_at: datetime

class OTPVerification(BaseModel):
    qr_session_id: str
    otp: str

# --- UTILITY FUNCTIONS ---
def verify_password(plain_password, hashed_password):
    return get_password_hash(plain_password) == hashed_password

def get_password_hash(password):
    # Simple SHA-256 hash for demo purposes - use bcrypt in production
    return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return User(**user)

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def generate_qr_code(data: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    # Convert to base64
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_base64}"

async def send_otp_email(email: str, otp: str):
    """Mock email service - replace with real SMTP for production"""
    logger.info(f"📧 MOCK EMAIL: Sending OTP {otp} to {email}")
    # In production, implement real SMTP here using Gmail credentials
    return True

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

# --- ROOT ENDPOINT ---
@api_router.get("/")
async def root():
    return {"message": "QR Attendance System API", "status": "running"}

# --- AUTH ENDPOINTS ---
@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate, current_user: User = Depends(require_role([UserRole.SUPERADMIN, UserRole.SUBADMIN]))):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    user_dict = user_data.dict()
    user_dict.pop("password")
    user_obj = User(**user_dict)
    
    # Store in database
    user_with_password = user_obj.dict()
    user_with_password["hashed_password"] = hashed_password
    
    await db.users.insert_one(user_with_password)
    return user_obj

@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = await db.users.find_one({"email": user_credentials.email})
    if not user or not verify_password(user_credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_obj = User(**user)
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.post("/auth/student-login", response_model=Token)
async def student_login(credentials: StudentLogin):
    user = await db.users.find_one({
        "roll_no": credentials.roll_no, 
        "email": credentials.email,
        "role": UserRole.STUDENT
    })
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid roll number or email"
        )
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_obj = User(**user)
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# --- DEPARTMENT ENDPOINTS ---
@api_router.post("/departments", response_model=Department)
async def create_department(name: str, current_user: User = Depends(require_role([UserRole.SUPERADMIN]))):
    department = Department(name=name, created_by=current_user.id)
    await db.departments.insert_one(department.dict())
    return department

@api_router.get("/departments", response_model=List[Department])
async def get_departments(current_user: User = Depends(get_current_user)):
    departments = await db.departments.find().to_list(None)
    return [Department(**dept) for dept in departments]

# --- CLASS ENDPOINTS ---
@api_router.post("/classes", response_model=Class)
async def create_class(name: str, department_id: str, current_user: User = Depends(require_role([UserRole.SUBADMIN]))):
    # Verify department exists
    department = await db.departments.find_one({"id": department_id})
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    class_obj = Class(name=name, department_id=department_id, created_by=current_user.id)
    await db.classes.insert_one(class_obj.dict())
    return class_obj

@api_router.get("/classes", response_model=List[Class])
async def get_classes(current_user: User = Depends(get_current_user)):
    classes = await db.classes.find().to_list(None)
    return [Class(**cls) for cls in classes]

# --- SCHEDULE ENDPOINTS ---
@api_router.post("/schedules", response_model=Schedule)
async def create_schedule(schedule_data: Schedule, current_user: User = Depends(require_role([UserRole.SUBADMIN]))):
    schedule_dict = schedule_data.dict()
    await db.schedules.insert_one(schedule_dict)
    return schedule_data

@api_router.get("/schedules", response_model=List[Schedule])
async def get_schedules(class_id: Optional[str] = None, teacher_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if class_id:
        query["class_id"] = class_id
    if teacher_id:
        query["teacher_id"] = teacher_id
    
    schedules = await db.schedules.find(query).to_list(None)
    return [Schedule(**schedule) for schedule in schedules]

# --- QR CODE ENDPOINTS ---
@api_router.post("/qr/generate", response_model=QRCodeResponse)
async def generate_qr_session(class_id: str, subject: str, current_user: User = Depends(require_role([UserRole.CLASS_TEACHER, UserRole.SUB_TEACHER]))):
    # Check if teacher is assigned to this class
    if current_user.role == UserRole.CLASS_TEACHER and current_user.class_id != class_id:
        raise HTTPException(status_code=403, detail="Not assigned to this class")
    
    # Generate QR session
    session_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)  # 15 minutes validity
    
    qr_data = f"attendance:{session_id}:{class_id}:{current_user.id}"
    qr_code_base64 = generate_qr_code(qr_data)
    
    qr_session = QRSession(
        id=session_id,
        class_id=class_id,
        teacher_id=current_user.id,
        subject=subject,
        qr_code=qr_code_base64,
        expires_at=expires_at
    )
    
    await db.qr_sessions.insert_one(qr_session.dict())
    
    return QRCodeResponse(
        qr_code_base64=qr_code_base64,
        session_id=session_id,
        expires_at=expires_at
    )

# --- ATTENDANCE ENDPOINTS ---
@api_router.post("/attendance/scan")
async def scan_qr_code(qr_session_id: str, background_tasks: BackgroundTasks, current_user: User = Depends(require_role([UserRole.STUDENT]))):
    # Verify QR session exists and is valid
    qr_session = await db.qr_sessions.find_one({"id": qr_session_id})
    if not qr_session:
        raise HTTPException(status_code=404, detail="Invalid QR code")
    
    qr_session_obj = QRSession(**qr_session)
    if datetime.now(timezone.utc) > qr_session_obj.expires_at:
        raise HTTPException(status_code=400, detail="QR code has expired")
    
    # Check if student belongs to this class
    if current_user.class_id != qr_session_obj.class_id:
        raise HTTPException(status_code=403, detail="Not enrolled in this class")
    
    # Check if already marked attendance
    existing_attendance = await db.attendance.find_one({
        "student_id": current_user.id,
        "qr_session_id": qr_session_id
    })
    
    if existing_attendance:
        raise HTTPException(status_code=400, detail="Attendance already marked")
    
    # Generate OTP
    otp = generate_otp()
    otp_request = OTPRequest(
        student_id=current_user.id,
        qr_session_id=qr_session_id,
        otp=otp,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
    )
    
    await db.otp_requests.insert_one(otp_request.dict())
    
    # Send OTP email in background
    background_tasks.add_task(send_otp_email, current_user.email, otp)
    
    return {"message": "OTP sent to your email", "expires_in": "5 minutes"}

@api_router.post("/attendance/verify")
async def verify_otp(verification: OTPVerification, current_user: User = Depends(require_role([UserRole.STUDENT]))):
    # Find OTP request
    otp_request = await db.otp_requests.find_one({
        "student_id": current_user.id,
        "qr_session_id": verification.qr_session_id,
        "otp": verification.otp,
        "verified": False
    })
    
    if not otp_request:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    otp_obj = OTPRequest(**otp_request)
    if datetime.now(timezone.utc) > otp_obj.expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired")
    
    # Get QR session details
    qr_session = await db.qr_sessions.find_one({"id": verification.qr_session_id})
    qr_session_obj = QRSession(**qr_session)
    
    # Mark attendance
    attendance = Attendance(
        student_id=current_user.id,
        class_id=qr_session_obj.class_id,
        teacher_id=qr_session_obj.teacher_id,
        subject=qr_session_obj.subject,
        date=datetime.now(timezone.utc),
        qr_session_id=verification.qr_session_id
    )
    
    await db.attendance.insert_one(attendance.dict())
    
    # Mark OTP as verified
    await db.otp_requests.update_one(
        {"_id": otp_request["_id"]},
        {"$set": {"verified": True}}
    )
    
    return {"message": "Attendance marked successfully"}

# --- STUDENT MANAGEMENT ---
@api_router.post("/students", response_model=User)
async def add_student(student_data: UserCreate, current_user: User = Depends(require_role([UserRole.CLASS_TEACHER]))):
    student_data.role = UserRole.STUDENT
    student_data.class_id = current_user.class_id
    
    # Check if student already exists
    existing = await db.users.find_one({"email": student_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Student already exists")
    
    # Create student (no password for students)
    user_dict = student_data.dict()
    user_dict.pop("password", None)  # Students don't need password
    user_obj = User(**user_dict)
    
    await db.users.insert_one(user_obj.dict())
    return user_obj

@api_router.get("/students", response_model=List[User])
async def get_students(current_user: User = Depends(require_role([UserRole.CLASS_TEACHER, UserRole.SUB_TEACHER]))):
    query = {"role": UserRole.STUDENT}
    if current_user.role == UserRole.CLASS_TEACHER:
        query["class_id"] = current_user.class_id
    
    students = await db.users.find(query).to_list(None)
    return [User(**student) for student in students]

# --- REPORTS ---
@api_router.get("/reports/attendance")
async def get_attendance_report(
    class_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(require_role([UserRole.CLASS_TEACHER, UserRole.SUB_TEACHER, UserRole.SUBADMIN]))
):
    query = {}
    
    if class_id:
        query["class_id"] = class_id
    elif current_user.role == UserRole.CLASS_TEACHER:
        query["class_id"] = current_user.class_id
    
    if start_date and end_date:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
        query["date"] = {"$gte": start, "$lte": end}
    
    attendance_records = await db.attendance.find(query).to_list(None)
    
    # Get student and class details
    enriched_records = []
    for record in attendance_records:
        student = await db.users.find_one({"id": record["student_id"]})
        class_info = await db.classes.find_one({"id": record["class_id"]})
        
        enriched_record = {
            **record,
            "student_name": student["username"] if student else "Unknown",
            "student_roll_no": student["roll_no"] if student else "Unknown",
            "class_name": class_info["name"] if class_info else "Unknown"
        }
        enriched_records.append(enriched_record)
    
    return enriched_records

# --- DASHBOARD DATA ---
@api_router.get("/dashboard")
async def get_dashboard_data(current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    
    if current_user.role == UserRole.STUDENT:
        # Student dashboard
        attendance_count = await db.attendance.count_documents({
            "student_id": current_user.id,
            "date": {
                "$gte": datetime.combine(today, datetime.min.time()),
                "$lt": datetime.combine(today + timedelta(days=1), datetime.min.time())
            }
        })
        
        return {
            "role": current_user.role,
            "today_attendance": attendance_count,
            "class_id": current_user.class_id
        }
    
    elif current_user.role in [UserRole.CLASS_TEACHER, UserRole.SUB_TEACHER]:
        # Teacher dashboard
        query = {"date": {
            "$gte": datetime.combine(today, datetime.min.time()),
            "$lt": datetime.combine(today + timedelta(days=1), datetime.min.time())
        }}
        
        if current_user.role == UserRole.CLASS_TEACHER:
            query["class_id"] = current_user.class_id
        
        attendance_count = await db.attendance.count_documents(query)
        
        return {
            "role": current_user.role,
            "today_attendance_marked": attendance_count,
            "class_id": current_user.class_id
        }
    
    else:
        # Admin dashboard
        total_students = await db.users.count_documents({"role": UserRole.STUDENT})
        total_classes = await db.classes.count_documents({})
        today_attendance = await db.attendance.count_documents({
            "date": {
                "$gte": datetime.combine(today, datetime.min.time()),
                "$lt": datetime.combine(today + timedelta(days=1), datetime.min.time())
            }
        })
        
        return {
            "role": current_user.role,
            "total_students": total_students,
            "total_classes": total_classes,
            "today_attendance": today_attendance
        }

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Create default superadmin on startup
@app.on_event("startup")
async def create_default_admin():
    admin_exists = await db.users.find_one({"role": UserRole.SUPERADMIN})
    if not admin_exists:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@school.com",
            "username": "Super Admin",
            "role": UserRole.SUPERADMIN,
            "hashed_password": get_password_hash("admin123"),
            "created_at": datetime.now(timezone.utc),
            "is_active": True
        }
        await db.users.insert_one(admin_user)
        logger.info("Default superadmin created: admin@school.com / admin123")