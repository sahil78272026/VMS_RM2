from sqlalchemy.orm import Session
"""
Guard Service
"""
import bcrypt
from datetime import datetime
import logging
logger = logging.getLogger(__name__)
from app.models import User, Guard
from app.repositories import GuardRepository, UserRepository
from app.utils.exceptions import (
    NotFoundError, ValidationError, DuplicateEntryError
)


class GuardService:
    def __init__(self, db: Session):
        self.db = db
        self.repo      = GuardRepository(db)
        self.user_repo = UserRepository(db)

    def get_all(self, society_id: int = None):
        return self.repo.get_all_by_society(society_id)

    def get_by_id(self, guard_id: int):
        guard = self.repo.get_by_id(guard_id)
        if not guard:
            raise NotFoundError("Guard")
        return guard

    def get_by_user(self, user_id: int, society_id: int = None):
        guard = self.repo.get_by_user(user_id, society_id=society_id)
        if not guard:
            raise NotFoundError("Guard profile")
        return guard

    def create(self, data: dict):
        errors = {}
        if not data.get("name"):        errors["name"]        = "Required"
        if not data.get("phone"):       errors["phone"]       = "Required"
        if not data.get("employee_id"): errors["employee_id"] = "Required"
        if not data.get("shift"):       errors["shift"]       = "Required"
        if errors:
            raise ValidationError(errors)

        society_id = data.get("society_id", 1)

        if self.repo.employee_id_exists(data["employee_id"], society_id=society_id):
            raise DuplicateEntryError(f"Employee ID '{data['employee_id']}' already exists in this society", field="employee_id")

        # Find or create user
        user = self.user_repo.get_by_phone(data["phone"])
        if not user:
            # Use provided password or default to employee_id
            raw_password = data.get("password") or data["employee_id"]
            password_hash = bcrypt.hashpw(
                raw_password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            user = User(
                name          = data["name"].strip(),
                phone         = data["phone"].strip(),
                email         = data.get("email"),
                password_hash = password_hash,
                role          = "guard",
                status        = "active",
            )
            self.user_repo.save(user)
        else:
            # If user already exists, update role if needed
            user.status = "active"
            self.user_repo.save(user)

        shift_pin_hash = None
        if data.get("shift_pin"):
            shift_pin_hash = bcrypt.hashpw(
                str(data["shift_pin"]).encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

        guard = Guard(
            society_id     = society_id,
            user_id        = user.id,
            employee_id    = data["employee_id"].strip(),
            shift          = data["shift"],
            shift_pin_hash = shift_pin_hash,
        )
        self.repo.save(guard)
        logger.info(f"[GUARD] Created: {user.name} ({guard.employee_id}) in society {society_id}")
        return guard

    def update(self, guard_id: int, data: dict):
        guard = self.get_by_id(guard_id)
        if data.get("shift"):
            guard.shift = data["shift"]
        if data.get("employee_id"):
            if self.repo.employee_id_exists(data["employee_id"], society_id=guard.society_id, exclude_id=guard_id):
                raise DuplicateEntryError("Employee ID already exists in this society", field="employee_id")
            guard.employee_id = data["employee_id"]
        if data.get("shift_pin"):
            guard.shift_pin_hash = bcrypt.hashpw(
                str(data["shift_pin"]).encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")
        self.repo.save(guard)
        return guard

    def deactivate(self, guard_id: int):
        guard = self.get_by_id(guard_id)
        guard.user.status = "inactive"
        self.user_repo.save(guard.user)
        logger.info(f"[GUARD] Deactivated: {guard_id}")
