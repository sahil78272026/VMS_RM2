from sqlalchemy.orm import Session
"""
Frequent Pass Service
"""
from datetime import date
import logging
logger = logging.getLogger(__name__)
from app.models import FrequentPass
from app.repositories import FrequentPassRepository, VisitorRepository
from app.utils.exceptions import (
    NotFoundError, ValidationError, ForbiddenError
)


VALID_DAYS = {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}


class FrequentPassService:
    def __init__(self, db: Session):
        self.db = db
        self.repo         = FrequentPassRepository(db)
        self.visitor_repo = VisitorRepository(db)

    def get_by_flat_user(self, flat_user_id: int):
        return self.repo.get_active_by_flat_user(flat_user_id)

    def create(self, flat_user_id: int, data: dict):
        errors = {}
        if not data.get("visitor_phone"):  errors["visitor_phone"]  = "Required"
        if not data.get("visitor_name"):   errors["visitor_name"]   = "Required"
        if not data.get("name"):           errors["name"]           = "Required — friendly label"
        if not data.get("allowed_days"):   errors["allowed_days"]   = "Required — e.g. mon,tue,wed"
        if not data.get("allowed_from"):   errors["allowed_from"]   = "Required — e.g. 08:00"
        if not data.get("allowed_until"):  errors["allowed_until"]  = "Required — e.g. 10:00"
        if not data.get("valid_from"):     errors["valid_from"]     = "Required"
        if errors:
            raise ValidationError(errors)

        # Validate allowed_days
        days = [d.strip() for d in data["allowed_days"].split(",")]
        invalid_days = [d for d in days if d not in VALID_DAYS]
        if invalid_days:
            raise ValidationError({"allowed_days": f"Invalid days: {invalid_days}. Use: mon,tue,wed,thu,fri,sat,sun"})

        # Get or create visitor identity
        visitor = self.visitor_repo.get_by_phone(data["visitor_phone"])
        if not visitor:
            from app.models import Visitor
            visitor = Visitor(name=data["visitor_name"].strip(), phone=data["visitor_phone"].strip())
            self.visitor_repo.save(visitor)

        freq_pass = FrequentPass(
            flat_user_id  = flat_user_id,
            visitor_id    = visitor.id,
            name          = data["name"].strip(),
            valid_from    = date.fromisoformat(data["valid_from"]),
            valid_until   = date.fromisoformat(data["valid_until"]) if data.get("valid_until") else None,
            allowed_days  = ",".join(days),
            allowed_from  = data["allowed_from"],
            allowed_until = data["allowed_until"],
            status        = "active",
        )
        self.repo.save(freq_pass)
        logger.info(
            f"[FREQUENT_PASS] Created for flat_user {flat_user_id} "
            f"— visitor: {visitor.phone} — label: {freq_pass.name}"
        )
        return freq_pass

    def update(self, flat_user_id: int, pass_id: int, data: dict):
        fp = self._get_owned(flat_user_id, pass_id)
        if data.get("name"):          fp.name          = data["name"]
        if data.get("allowed_days"):  fp.allowed_days  = data["allowed_days"]
        if data.get("allowed_from"):  fp.allowed_from  = data["allowed_from"]
        if data.get("allowed_until"): fp.allowed_until = data["allowed_until"]
        if data.get("valid_until"):
            fp.valid_until = date.fromisoformat(data["valid_until"])
        self.repo.save(fp)
        return fp

    def suspend(self, flat_user_id: int, pass_id: int):
        fp = self._get_owned(flat_user_id, pass_id)
        fp.status = "suspended"
        self.repo.save(fp)
        logger.info(f"[FREQUENT_PASS] Suspended: {pass_id}")
        return fp

    def activate(self, flat_user_id: int, pass_id: int):
        fp = self._get_owned(flat_user_id, pass_id)
        fp.status = "active"
        self.repo.save(fp)
        logger.info(f"[FREQUENT_PASS] Activated: {pass_id}")
        return fp

    def delete(self, flat_user_id: int, pass_id: int):
        fp = self._get_owned(flat_user_id, pass_id)
        self.repo.delete(fp)
        logger.info(f"[FREQUENT_PASS] Deleted: {pass_id}")

    def check(self, phone: str, flat_id: int):
        """Guard checks if a frequent pass is valid right now for this visitor and flat."""
        visitor = self.visitor_repo.get_by_phone(phone)
        if not visitor:
            return None
        return self.repo.find_valid(visitor.id, flat_id)

    def _get_owned(self, flat_user_id: int, pass_id: int):
        fp = self.repo.get_by_id(pass_id)
        if not fp:
            raise NotFoundError("Frequent pass")
        if fp.flat_user_id != flat_user_id:
            raise ForbiddenError("This pass does not belong to you")
        return fp
