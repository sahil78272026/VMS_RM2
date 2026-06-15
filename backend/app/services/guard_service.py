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

    def get_all(self):
        return self.repo.get_all()

    def get_by_id(self, guard_id):
        guard = self.repo.get_by_id(guard_id)
        if not guard:
            raise NotFoundError("Guard")
        return guard

    def get_by_user(self, user_id):
        guard = self.repo.get_by_user(user_id)
        if not guard:
            raise NotFoundError("Guard profile")
        return guard

    def create(self, data):
        errors = {}
        if not data.get("name"):        errors["name"]        = "Required"
        if not data.get("phone"):       errors["phone"]       = "Required"
        if not data.get("employee_id"): errors["employee_id"] = "Required"
        if not data.get("shift"):       errors["shift"]       = "Required"
        if errors:
            raise ValidationError(errors)

        if self.user_repo.phone_exists(data["phone"]):
            raise DuplicateEntryError("Phone already registered", field="phone")

        if self.repo.employee_id_exists(data["employee_id"]):
            raise DuplicateEntryError("Employee ID already exists", field="employee_id")

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

        guard = Guard(
            user_id     = user.id,
            employee_id = data["employee_id"].strip(),
            shift       = data["shift"],
        )
        self.repo.save(guard)
        logger.info(f"[GUARD] Created: {user.name} ({guard.employee_id})")
        return guard

    def update(self, guard_id, data):
        guard = self.get_by_id(guard_id)
        if data.get("shift"):
            guard.shift = data["shift"]
        if data.get("employee_id"):
            if self.repo.employee_id_exists(data["employee_id"], exclude_id=guard_id):
                raise DuplicateEntryError("Employee ID already exists", field="employee_id")
            guard.employee_id = data["employee_id"]
        self.repo.save(guard)
        return guard

    def deactivate(self, guard_id):
        guard      = self.get_by_id(guard_id)
        guard.user.status = "inactive"
        self.user_repo.save(guard.user)
        logger.info(f"[GUARD] Deactivated: {guard_id}")
