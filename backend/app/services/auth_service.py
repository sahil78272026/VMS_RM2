from sqlalchemy.orm import Session
import bcrypt
from datetime import datetime
from typing import Optional
import logging

from app.models import User, Society, SocietyAdmin, FlatUser, Guard
from app.repositories import UserRepository, SocietyRepository
from app.utils.exceptions import (
    InvalidCredentialsError,
    AccountInactiveError,
    DuplicateEntryError,
    ValidationError,
    NotFoundError,
    ForbiddenError
)
from app.utils.security import create_access_token, create_refresh_token
from app.schemas.auth import RegisterResidentRequest
from app.services.otp_service import OTPService

logger = logging.getLogger(__name__)


class AuthService:

    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.society_repo = SocietyRepository(db)

    def register_resident(self, data: RegisterResidentRequest) -> dict:
        if self.user_repo.phone_exists(data.phone):
            raise DuplicateEntryError("Phone number already registered", field="phone")

        if data.email and self.user_repo.email_exists(data.email):
            raise DuplicateEntryError("Email already registered", field="email")

        import secrets
        raw_password = data.password or secrets.token_urlsafe(16)
        password_hash = bcrypt.hashpw(
            raw_password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        from datetime import date
        move_in = date.fromisoformat(data.move_in_date) if data.move_in_date else date.today()
        
        user = User(
            name          = data.name.strip() if data.name else "Resident",
            phone         = data.phone.strip(),
            email         = data.email.strip() if data.email else None,
            password_hash = password_hash,
            role          = "resident",
            status        = "pending_verification",
            requested_flat_id = data.flat_id,
            move_in_date  = move_in,
        )

        self.user_repo.save(user)
        logger.info(f"[AUTH] New resident registered: {user.phone}")

        from app.models import Flat
        flat = self.db.query(Flat).filter_by(id=data.flat_id).first()
        society_id = flat.society_id if flat else (data.society_id or 1)
        flat_number = flat.flat_number if flat else None
        
        from app.models import Society
        society = self.db.query(Society).filter_by(id=society_id).first()
        society_name = society.name if society else None
        
        user_societies = self.get_user_societies(user)
        active_society_id = society_id

        additional_claims = {
            "role":              user.role,
            "status":            user.status,
            "name":              user.name,
            "is_super_admin":    user.is_super_admin,
            "active_society_id": active_society_id,
            "flat_number":       flat_number,
            "society_name":      society_name,
        }

        access_token  = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

        user_dict = user.to_dict()
        user_dict["societies"] = user_societies
        user_dict["active_society_id"] = active_society_id
        user_dict["flat_number"] = flat_number
        user_dict["society_name"] = society_name

        return {
            "access_token":      access_token,
            "refresh_token":     refresh_token,
            "active_society_id": active_society_id,
            "user":              user_dict,
        }

    def get_user_societies(self, user: User) -> list:
        """Returns list of all societies this user belongs to or can access."""
        if user.is_super_admin:
            from app.models import Society
            all_societies = self.society_repo.db.query(Society).all()
            return [{
                "id": f"{s.id}_super_admin",
                "society_id": s.id,
                "society_name": s.name,
                "society_slug": s.slug,
                "society_status": s.status,
                "role": "super_admin"
            } for s in all_societies]
        
        # For regular users, the profiles are already generated accurately in user.to_dict()
        user_societies = user.to_dict().get("societies", [])
        # Filter out suspended societies for normal users
        return [s for s in user_societies if s.get("society_status") != "suspended"]

    def login(self, phone: str, password: str, expo_push_token: str = None, requested_society_id: int = None) -> dict:
        user = self.user_repo.get_by_phone(phone.strip())
        if not user:
            raise InvalidCredentialsError("No account found with this phone number. Please check or register.")

        password_match = bcrypt.checkpw(
            password.encode("utf-8"),
            user.password_hash.encode("utf-8")
        )
        if not password_match:
            raise InvalidCredentialsError("Incorrect password. Please try again.")

        if user.status == "inactive":
            raise AccountInactiveError("Your account is inactive. Please contact the society admin.")

        user.last_login = datetime.utcnow()
        if expo_push_token:
            user.expo_push_token = expo_push_token
        self.user_repo.save(user)

        user_societies = self.get_user_societies(user)
        raw_societies = user.to_dict().get("societies", [])

        if raw_societies and not user_societies and not user.is_super_admin:
            raise ForbiddenError("Your society access has been suspended or is unavailable. Please contact the administrator.")

        # Resolve active_society_id
        active_society_id = None
        if requested_society_id:
            if user.is_super_admin or any(s["society_id"] == requested_society_id for s in user_societies):
                active_society_id = requested_society_id
            else:
                raise ForbiddenError(f"User does not have access to society {requested_society_id}")
        else:
            if user_societies:
                active_society_id = user_societies[0]["society_id"]
            elif user.is_super_admin:
                active_society_id = 1
            else:
                active_society_id = None

        additional_claims = {
            "role":              user.role,
            "status":            user.status,
            "name":              user.name,
            "is_super_admin":    user.is_super_admin,
            "active_society_id": active_society_id,
        }

        access_token  = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

        logger.info(f"[AUTH] Login successful: {user.phone} ({user.role}) - active society: {active_society_id}")

        user_dict = user.to_dict()
        user_dict["societies"] = user_societies
        user_dict["active_society_id"] = active_society_id

        return {
            "access_token":      access_token,
            "refresh_token":     refresh_token,
            "active_society_id": active_society_id,
            "user":              user_dict,
        }

    def send_otp(self, phone: str) -> dict:
        phone_clean = phone.strip().replace(" ", "").replace("-", "")
        if not phone_clean:
            raise ValidationError({"phone": "Phone number is required."})

        return OTPService.send_otp(phone_clean)

    def verify_otp(self, phone: str, otp: str, expo_push_token: str = None, requested_society_id: int = None) -> dict:
        phone_clean = phone.strip().replace(" ", "").replace("-", "")
        if not phone_clean or not otp:
            raise ValidationError({"otp": "Phone and OTP code are required."})

        is_valid = OTPService.verify_otp(phone_clean, otp)
        if not is_valid:
            raise InvalidCredentialsError("Invalid or expired verification code. Please try again.")

        user = self.user_repo.get_by_phone(phone_clean)
        if not user:
            # New unregistered user
            return {
                "is_new_user": True,
                "phone": phone_clean,
                "message": "Phone number verified. Please register your account and select a flat."
            }

        if user.status == "inactive":
            raise AccountInactiveError("Your account is inactive. Please contact the society admin.")

        user.last_login = datetime.utcnow()
        if expo_push_token:
            user.expo_push_token = expo_push_token
        self.user_repo.save(user)

        user_societies = self.get_user_societies(user)
        raw_societies = user.to_dict().get("societies", [])

        if raw_societies and not user_societies and not user.is_super_admin:
            raise ForbiddenError("Your society access has been suspended or is unavailable. Please contact the administrator.")

        active_society_id = None
        if requested_society_id:
            if user.is_super_admin or any(s["society_id"] == requested_society_id for s in user_societies):
                active_society_id = requested_society_id
            else:
                raise ForbiddenError(f"User does not have access to society {requested_society_id}")
        else:
            if user_societies:
                active_society_id = user_societies[0]["society_id"]
            elif user.is_super_admin:
                active_society_id = 1
            else:
                active_society_id = None

        additional_claims = {
            "role":              user.role,
            "status":            user.status,
            "name":              user.name,
            "is_super_admin":    user.is_super_admin,
            "active_society_id": active_society_id,
        }

        access_token  = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

        logger.info(f"[AUTH] OTP Login successful: {user.phone} ({user.role}) - active society: {active_society_id}")

        user_dict = user.to_dict()
        user_dict["societies"] = user_societies
        user_dict["active_society_id"] = active_society_id
        
        society_name = None
        if active_society_id:
            from app.models import Society
            soc = self.user_repo.db.query(Society).filter_by(id=active_society_id).first()
            if soc:
                society_name = soc.name
        user_dict["society_name"] = society_name
        
        if user.requested_flat_id:
            from app.models import Flat
            flat_obj = self.user_repo.db.query(Flat).filter(Flat.id == user.requested_flat_id).first()
            if flat_obj:
                user_dict["flat_number"] = flat_obj.flat_number

        return {
            "is_new_user":       False,
            "access_token":      access_token,
            "refresh_token":     refresh_token,
            "active_society_id": active_society_id,
            "user":              user_dict,
        }

    def google_login(self, email: str, name: str = None, google_id: str = None, expo_push_token: str = None, requested_society_id: int = None) -> dict:
        import os
        import hashlib

        email_clean = (email or "").strip().lower()
        if not email_clean:
            raise ValidationError({"email": "A valid Google email is required."})

        user = self.user_repo.get_by_email(email_clean)
        if not user:
            phone_hash = hashlib.md5((google_id or email_clean).encode()).hexdigest()[:8]
            unique_phone = f"g_{phone_hash}"

            # Check if this phone slug is unique
            if self.user_repo.phone_exists(unique_phone):
                unique_phone = f"g_{unique_phone[2:6]}_{os.urandom(2).hex()}"

            password_hash = bcrypt.hashpw(
                os.urandom(16).hex().encode("utf-8"),
                bcrypt.gensalt()
            ).decode("utf-8")

            user = User(
                name          = (name or email_clean.split("@")[0]).strip(),
                email         = email_clean,
                phone         = unique_phone,
                password_hash = password_hash,
                role          = "resident",
                status        = "active",
            )
            self.user_repo.save(user)
            logger.info(f"[AUTH] New user created via Google SSO: {email_clean}")
        else:
            if user.status == "inactive":
                raise AccountInactiveError("Your account is deactivated. Please contact society administration.")

        user.last_login = datetime.utcnow()
        if expo_push_token:
            user.expo_push_token = expo_push_token
        self.user_repo.save(user)

        user_societies = self.get_user_societies(user)

        active_society_id = None
        if requested_society_id:
            if user.is_super_admin or any(s["society_id"] == requested_society_id for s in user_societies):
                active_society_id = requested_society_id
            else:
                raise ForbiddenError(f"User does not have access to society {requested_society_id}")
        else:
            if user_societies:
                active_society_id = user_societies[0]["society_id"]
            elif user.is_super_admin:
                active_society_id = 1
            else:
                active_society_id = None

        additional_claims = {
            "role":              user.role,
            "status":            user.status,
            "name":              user.name,
            "is_super_admin":    user.is_super_admin,
            "active_society_id": active_society_id,
        }

        access_token  = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

        logger.info(f"[AUTH] Google Login successful: {user.email} ({user.role}) - active society: {active_society_id}")

        user_dict = user.to_dict()
        user_dict["societies"] = user_societies
        user_dict["active_society_id"] = active_society_id

        return {
            "access_token":      access_token,
            "refresh_token":     refresh_token,
            "active_society_id": active_society_id,
            "user":              user_dict,
        }

    def switch_society(self, user_id: int, target_society_id: int) -> dict:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User")

        user_societies = self.get_user_societies(user)
        if not user.is_super_admin and not any(s["society_id"] == target_society_id for s in user_societies):
            raise ForbiddenError(f"User does not have access to society {target_society_id}")

        additional_claims = {
            "role":              user.role,
            "status":            user.status,
            "name":              user.name,
            "is_super_admin":    user.is_super_admin,
            "active_society_id": target_society_id,
        }

        access_token  = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

        logger.info(f"[AUTH] User {user_id} switched active society to {target_society_id}")

        user_dict = user.to_dict()
        user_dict["societies"] = user_societies
        user_dict["active_society_id"] = target_society_id

        return {
            "access_token":      access_token,
            "refresh_token":     refresh_token,
            "active_society_id": target_society_id,
            "user":              user_dict,
        }

    def change_password(self, user_id: int, current_password: str, new_password: str) -> bool:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User")

        if not bcrypt.checkpw(current_password.encode("utf-8"), user.password_hash.encode("utf-8")):
            raise ValidationError({"current_password": "Current password is incorrect"})

        user.password_hash = bcrypt.hashpw(
            new_password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        self.user_repo.save(user)
        logger.info(f"[AUTH] Password changed for user: {user_id}")
        return True
