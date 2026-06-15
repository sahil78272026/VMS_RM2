from sqlalchemy.orm import Session
"""
Announcement Service
"""
from datetime import datetime
import logging
logger = logging.getLogger(__name__)
from app.models import Announcement
from app.repositories import AnnouncementRepository
from app.utils.exceptions import NotFoundError, ValidationError


class AnnouncementService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AnnouncementRepository(db)

    def get_active(self, page=1, per_page=20):
        return self.repo.get_active(page=page, per_page=per_page)

    def get_by_id(self, announcement_id: int):
        announcement = self.repo.get_by_id(announcement_id)
        if not announcement:
            raise NotFoundError("Announcement")
        return announcement

    def create(self, user_id: int, data: dict):
        errors = {}
        if not data.get("title"): errors["title"] = "Required"
        if not data.get("body"):  errors["body"]  = "Required"
        if errors:
            raise ValidationError(errors)

        announcement = Announcement(
            created_by     = user_id,
            title          = data["title"].strip(),
            body           = data["body"].strip(),
            priority       = data.get("priority", "normal"),
            attachment_url = data.get("attachment_url"),
            expires_at     = datetime.fromisoformat(data["expires_at"]) if data.get("expires_at") else None,
        )
        self.repo.save(announcement)

        # Notify all residents — urgent ones get push notification
        from app.services.notification_service import NotificationService
        NotificationService(self.db).notify_announcement(announcement)

        logger.info(
            f"[ANNOUNCEMENT] Created by admin {user_id} "
            f"— title: {announcement.title} | priority: {announcement.priority}"
        )
        return announcement

    def update(self, announcement_id: int, data: dict):
        announcement = self.get_by_id(announcement_id)
        if data.get("title"):      announcement.title      = data["title"]
        if data.get("body"):       announcement.body       = data["body"]
        if data.get("priority"):   announcement.priority   = data["priority"]
        if data.get("expires_at"): announcement.expires_at = datetime.fromisoformat(data["expires_at"])
        self.repo.save(announcement)
        return announcement

    def delete(self, announcement_id: int):
        """Expire an announcement immediately instead of hard deleting."""
        announcement = self.get_by_id(announcement_id)
        announcement.expires_at = datetime.utcnow()
        self.repo.save(announcement)
        logger.info(f"[ANNOUNCEMENT] Expired: {announcement_id}")
