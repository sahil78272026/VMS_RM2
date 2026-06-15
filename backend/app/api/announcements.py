"""
Announcements Routes — /api/v1/announcements
Admin creates announcements. All roles can view active ones.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.announcement_service import AnnouncementService
from app.utils.response import success, error
from app.utils.exceptions import AppException



router = APIRouter(prefix="/api/v1/announcements", tags=["announcements"])

@router.get("")
async def get_announcements(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    All roles: list active announcements.
    Active = not expired. Sorted by priority then date.
    """
    try:
        announcement_service = AnnouncementService(db)
        page     = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 20))
        result   = announcement_service.get_active(page, per_page)
        return success(
            "Announcements fetched",
            data=[a.to_dict() for a in result["items"]],
            meta=result["meta"]
        )
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch announcements", "SERVER_ERROR", str(e), 500)


@router.get("/{announcement_id}")
async def get_announcement(announcement_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """All roles: get full announcement content."""
    try:
        announcement_service = AnnouncementService(db)
        announcement = announcement_service.get_by_id(announcement_id)
        return success("Announcement fetched", data=announcement.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch announcement", "SERVER_ERROR", str(e), 500)


@router.post("")
async def create_announcement(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Admin: create a new society announcement.
    Notifies all residents via push if priority is urgent.
    """
    try:
        announcement_service = AnnouncementService(db)
        user_id      = current_user.id
        data         = await request.json()
        announcement = announcement_service.create(user_id, data)
        return success("Announcement posted", data=announcement.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to post announcement", "SERVER_ERROR", str(e), 500)


@router.patch("/{announcement_id}")
async def update_announcement(announcement_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: edit an existing announcement."""
    try:
        announcement_service = AnnouncementService(db)
        data         = await request.json()
        announcement = announcement_service.update(announcement_id, data)
        return success("Announcement updated", data=announcement.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to update announcement", "SERVER_ERROR", str(e), 500)


@router.delete("/{announcement_id}")
async def delete_announcement(announcement_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: delete or expire an announcement immediately."""
    try:
        announcement_service = AnnouncementService(db)
        announcement_service.delete(announcement_id)
        return success("Announcement removed")
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to delete announcement", "SERVER_ERROR", str(e), 500)
