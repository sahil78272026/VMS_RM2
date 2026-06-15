from sqlalchemy.orm import Session
"""
Pre Approval Service
"""
from datetime import datetime
import logging
logger = logging.getLogger(__name__)
from app.models import PreApproval
from app.repositories import PreApprovalRepository
from app.utils.exceptions import (
    NotFoundError, ValidationError, ForbiddenError
)


class PreApprovalService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PreApprovalRepository(db)

    def get_by_flat_user(self, flat_user_id: int):
        return self.repo.get_active_by_flat_user(flat_user_id)

    def create(self, flat_user_id: int, data: dict):
        errors = {}
        if not data.get("visitor_name"):  errors["visitor_name"]  = "Required"
        if not data.get("visitor_phone"): errors["visitor_phone"] = "Required"
        if not data.get("valid_from"):    errors["valid_from"]    = "Required"
        if not data.get("valid_until"):   errors["valid_until"]   = "Required"
        if errors:
            raise ValidationError(errors)

        valid_from  = datetime.fromisoformat(data["valid_from"])
        valid_until = datetime.fromisoformat(data["valid_until"])

        if valid_until <= valid_from:
            raise ValidationError({"valid_until": "Must be after valid_from"})

        pre_approval = PreApproval(
            flat_user_id    = flat_user_id,
            visitor_name    = data["visitor_name"].strip(),
            visitor_phone   = data["visitor_phone"].strip(),
            valid_from      = valid_from,
            valid_until     = valid_until,
            purpose         = data.get("purpose"),
            is_recurring    = data.get("is_recurring", False),
            recurrence_rule = data.get("recurrence_rule"),
            status          = "active",
        )
        self.repo.save(pre_approval)
        logger.info(
            f"[PRE_APPROVAL] Created for flat_user {flat_user_id} "
            f"— visitor: {pre_approval.visitor_phone}"
        )
        return pre_approval

    def update(self, flat_user_id: int, pre_approval_id: int, data: dict):
        pa = self.repo.get_by_id(pre_approval_id)
        if not pa:
            raise NotFoundError("Pre-approval")
        if pa.flat_user_id != flat_user_id:
            raise ForbiddenError("This pre-approval does not belong to you")

        if data.get("valid_from"):      pa.valid_from      = datetime.fromisoformat(data["valid_from"])
        if data.get("valid_until"):     pa.valid_until     = datetime.fromisoformat(data["valid_until"])
        if data.get("purpose"):         pa.purpose         = data["purpose"]
        if data.get("visitor_name"):    pa.visitor_name    = data["visitor_name"]
        if data.get("visitor_phone"):   pa.visitor_phone   = data["visitor_phone"]
        if data.get("is_recurring") is not None:
            pa.is_recurring    = data["is_recurring"]
            pa.recurrence_rule = data.get("recurrence_rule")

        self.repo.save(pa)
        return pa

    def cancel(self, flat_user_id: int, pre_approval_id: int):
        pa = self.repo.get_by_id(pre_approval_id)
        if not pa:
            raise NotFoundError("Pre-approval")
        if pa.flat_user_id != flat_user_id:
            raise ForbiddenError("This pre-approval does not belong to you")

        pa.status = "cancelled"
        self.repo.save(pa)
        logger.info(f"[PRE_APPROVAL] Cancelled: {pre_approval_id}")

    def check(self, phone: str, flat_id: int):
        """Guard checks if visitor has a valid pre-approval right now."""
        return self.repo.find_valid(phone, flat_id)
