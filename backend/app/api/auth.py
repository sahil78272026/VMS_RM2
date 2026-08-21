from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import (
    RegisterResidentRequest,
    LoginRequest,
    GoogleLoginRequest,
    ChangePasswordRequest,
    SendOTPRequest,
    VerifyOTPRequest,
    RequestFlatRequest
)
from app.api.deps import get_current_user, active_account_required
from app.models import User
router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


class SwitchSocietyRequest(BaseModel):
    society_id: int


@router.post("/send-otp")
def send_otp(request: Request, data: SendOTPRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    result = auth_service.send_otp(data.phone)
    return {
        "success": result["success"],
        "message": result["message"],
        "data": result,
        "error": None
    }


@router.post("/verify-otp")
def verify_otp(request: Request, data: VerifyOTPRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    result = auth_service.verify_otp(
        phone=data.phone,
        otp=data.otp,
        expo_push_token=data.expo_push_token,
        requested_society_id=data.society_id
    )
    return {
        "success": True,
        "message": "OTP verified successfully",
        "data": result,
        "error": None
    }


@router.post("/register")
def register(request: Request, data: RegisterResidentRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    user = auth_service.register_resident(data)
    return {
        "success": True,
        "message": "Registration successful. Your account is pending admin verification.",
        "data": user,
        "error": None
    }


@router.post("/request-flat")
def request_flat(
    data: RequestFlatRequest,
    current_user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
):
    current_user.requested_flat_id = data.flat_id
    current_user.status = "pending_verification"
    db.commit()
    return {
        "success": True,
        "message": "Flat request submitted successfully. Pending admin approval.",
        "data": current_user.to_dict(),
        "error": None
    }



@router.post("/login")
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
def refresh(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return error("No refresh token provided", "UNAUTHORIZED", status_code=401)
    
    raw_token = auth_header.split(" ")[1]
    try:
        import jwt
        from app.utils.security import JWT_SECRET_KEY, ALGORITHM, create_access_token
        payload = jwt.decode(raw_token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        from app.models import User
        user = db.query(User).filter_by(id=user_id).first()
        if not user or user.status == "inactive":
            return error("User inactive or not found", "UNAUTHORIZED", status_code=401)
            
        additional_claims = {
            "role":              user.role,
            "status":            user.status,
            "name":              user.name,
            "is_super_admin":    user.is_super_admin,
            "active_society_id": payload.get("active_society_id"),
        }
        
        new_access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        
        return {
            "success": True,
            "message": "Token refreshed",
            "data": {
                "access_token": new_access_token
            },
            "error": None
        }
    except jwt.ExpiredSignatureError:
        return error("Refresh token expired", "UNAUTHORIZED", status_code=401)
    except jwt.InvalidTokenError:
        return error("Invalid refresh token", "UNAUTHORIZED", status_code=401)


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
