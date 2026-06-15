from sqlalchemy.orm import Session
import bcrypt
from datetime import datetime
import logging

from app.models import User
from app.repositories import UserRepository
from app.utils.exceptions import (
    InvalidCredentialsError,
    AccountInactiveError,
    DuplicateEntryError,
    ValidationError,
    NotFoundError
)
from app.utils.security import create_access_token, create_refresh_token
from app.schemas.auth import RegisterResidentRequest

logger = logging.getLogger(__name__)

class AuthService:

    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

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
            move_in_date = date.fromisoformat(data.move_in_date) if data.move_in_date else None,
        )

        self.user_repo.save(user)
        logger.info(f"[AUTH] New resident registered: {user.phone}")

        return user.to_dict()

    def login(self, phone: str, password: str, expo_push_token: str = None) -> dict:
        user = self.user_repo.get_by_phone(phone)
        if not user:
            raise InvalidCredentialsError()

        password_match = bcrypt.checkpw(
            password.encode("utf-8"),
            user.password_hash.encode("utf-8")
        )
        if not password_match:
            raise InvalidCredentialsError()

        if user.status != "active":
            raise AccountInactiveError()

        user.last_login = datetime.utcnow()
        if expo_push_token:
            user.expo_push_token = expo_push_token
        self.user_repo.save(user)

        additional_claims = {
            "role":   user.role,
            "status": user.status,
            "name":   user.name,
        }

        access_token  = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

        logger.info(f"[AUTH] Login successful: {user.phone} ({user.role})")

        return {
            "access_token":  access_token,
            "refresh_token": refresh_token,
            "user":          user.to_dict(),
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
