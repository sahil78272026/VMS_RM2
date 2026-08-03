from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class RegisterResidentRequest(BaseModel):
    name: Optional[str] = "Resident"
    phone: str
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    flat_id: int
    society_id: Optional[int] = None
    move_in_date: Optional[str] = None

class LoginRequest(BaseModel):
    phone: str
    password: str
    society_id: Optional[int] = None
    expo_push_token: Optional[str] = None

class GoogleLoginRequest(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    google_id: Optional[str] = None
    photo_url: Optional[str] = None
    society_id: Optional[int] = None
    expo_push_token: Optional[str] = None

class SendOTPRequest(BaseModel):
    phone: str

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str
    society_id: Optional[int] = None
    expo_push_token: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
