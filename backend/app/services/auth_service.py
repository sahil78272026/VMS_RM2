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

        password_hash = bcrypt.hashpw(
            data.password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        from datetime import date
        
        user = User(
            name          = data.name.strip(),
            phone         = data.phone.strip(),
            email         = data.email.strip() if data.email else None,
            password_hash = password_hash,
            role          = "resident",
            status        = "pending_verification",
            requested_flat_id = data.flat_id,
            move_in_date  = date.fromisoformat(data.move_in_date) if data.move_in_date else None,
        )

        self.user_repo.save(user)
        logger.info(f"[AUTH] New resident registered: {user.phone}")

        return user.to_dict()

    def get_user_societies(self, user: User) -> list:
        """Returns list of all societies this user belongs to or can access."""
        if user.is_super_admin:
            all_societies = self.society_repo.get_all_active()
            return [s.to_dict() for s in all_societies]
        
        societies = self.society_repo.get_user_societies(user.id)
        return [s.to_dict() for s in societies]

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

        if user.status != "active":
            if user.status == "pending_verification":
                raise AccountInactiveError("Your flat registration is pending approval by the Society Admin.")
            raise AccountInactiveError("Your account is inactive. Please contact the society admin.")

        user.last_login = datetime.utcnow()
        if expo_push_token:
            user.expo_push_token = expo_push_token
        self.user_repo.save(user)

        user_societies = self.get_user_societies(user)

        # Resolve active_society_id
        active_society_id = None
        if requested_society_id:
            # Check if user has access
            if user.is_super_admin or any(s["id"] == requested_society_id for s in user_societies):
                active_society_id = requested_society_id
            else:
                raise ForbiddenError(f"User does not have access to society {requested_society_id}")
        else:
            if user_societies:
                active_society_id = user_societies[0]["id"]
            else:
                active_society_id = 1

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
            if user.is_super_admin or any(s["id"] == requested_society_id for s in user_societies):
                active_society_id = requested_society_id
            else:
                raise ForbiddenError(f"User does not have access to society {requested_society_id}")
        else:
            if user_societies:
                active_society_id = user_societies[0]["id"]
            else:
                active_society_id = 1

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
        if not user.is_super_admin and not any(s["id"] == target_society_id for s in user_societies):
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
