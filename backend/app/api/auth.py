from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import RegisterResidentRequest, LoginRequest, GoogleLoginRequest, ChangePasswordRequest
from app.api.deps import get_current_user, active_account_required
from app.models import User
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


class SwitchSocietyRequest(BaseModel):
    society_id: int


@router.post("/register")
@limiter.limit("10/minute")
def register(request: Request, data: RegisterResidentRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    user = auth_service.register_resident(data)
    return {
        "success": True,
        "message": "Registration successful. Your account is pending admin verification.",
        "data": user,
        "error": None
    }


@router.post("/login")
@limiter.limit("20/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    result = auth_service.login(
        phone=data.phone,
        password=data.password,
        expo_push_token=data.expo_push_token,
        requested_society_id=data.society_id
    )
    return {
        "success": True,
        "message": "Login successful",
        "data": result,
        "error": None
    }


@router.post("/google")
@limiter.limit("20/minute")
def google_login(request: Request, data: GoogleLoginRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    result = auth_service.google_login(
        email=data.email,
        name=data.name,
        google_id=data.google_id,
        expo_push_token=data.expo_push_token,
        requested_society_id=data.society_id
    )
    return {
        "success": True,
        "message": "Google Login successful",
        "data": result,
        "error": None
    }


@router.get("/my-societies")
def get_my_societies(
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    societies = auth_service.get_user_societies(current_user)
    return {
        "success": True,
        "message": "Societies retrieved",
        "data": societies,
        "error": None
    }


@router.post("/switch-society")
def switch_society(
    data: SwitchSocietyRequest,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    result = auth_service.switch_society(current_user.id, data.society_id)
    return {
        "success": True,
        "message": "Switched active society",
        "data": result,
        "error": None
    }


@router.post("/refresh")
def refresh():
    return {
        "success": False,
        "message": "Refresh token logic not yet implemented for FastAPI.",
        "data": None,
        "error": None
    }


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {
        "success": True,
        "message": "Logged out successfully",
        "data": None,
        "error": None
    }


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest, 
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    auth_service.change_password(current_user.id, data.current_password, data.new_password)
    return {
        "success": True,
        "message": "Password changed successfully",
        "data": None,
        "error": None
    }
