"""
Notifications Routes — /api/v1/notifications
Every user can view and manage their own notifications.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.notification_service import NotificationService
from app.utils.response import success, error
from app.utils.exceptions import AppException



router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])

@router.get("/my")
async def get_my_notifications(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """All roles: get own notifications paginated."""
    try:
        notif_service = NotificationService(db)
        user_id  = current_user.id
        page     = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 20))
        result   = notif_service.get_for_user(user_id, page, per_page)
        return success(
            "Notifications fetched",
            data=[n.to_dict() for n in result["items"]],
            meta=result["meta"]
        )
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch notifications", "SERVER_ERROR", str(e), 500)


@router.get("/unread-count")
async def get_unread_count(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """All roles: get unread notification count for badge display."""
    try:
        notif_service = NotificationService(db)
        user_id = current_user.id
        count   = notif_service.get_unread_count(user_id)
        return success("Unread count fetched", data={"unread": count})
    except Exception as e:
        return error("Failed to fetch count", "SERVER_ERROR", str(e), 500)


@router.patch("/{notif_id}/read")
async def mark_read(notif_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Mark a single notification as read."""
    try:
        notif_service = NotificationService(db)
        user_id = current_user.id
        notif_service.mark_read(user_id, notif_id)
        return success("Notification marked as read")
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to mark as read", "SERVER_ERROR", str(e), 500)


@router.patch("/read-all")
async def mark_all_read(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Mark all notifications as read for the current user."""
    try:
        notif_service = NotificationService(db)
        user_id = current_user.id
        count   = notif_service.mark_all_read(user_id)
        return success(f"Marked {count} notifications as read")
    except Exception as e:
        return error("Failed to mark all as read", "SERVER_ERROR", str(e), 500)
