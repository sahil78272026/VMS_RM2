"""
Visitors Routes — /api/v1/visitors
Guards register and search visitors. Admin manages blacklist.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.visitor_service import VisitorService
from app.utils.response import success, error
from app.utils.exceptions import AppException



router = APIRouter(prefix="/api/v1/visitors", tags=["visitors"])

@router.get("")
async def search_visitors(request: Request, db: Session = Depends(get_db)):
    """
    Guard/Admin: search visitors by name or phone.
    Used at gate to quickly find returning visitors.
    Query param: ?q=phone_or_name
    """
    try:
        visitor_service = VisitorService(db)
        query    = request.query_params.get("q", "")
        page     = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 20))
        result   = visitor_service.search(query, page, per_page)
        return success(
            "Visitors fetched",
            data=[v.to_dict() for v in result["items"]],
            meta=result["meta"]
        )
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to search visitors", "SERVER_ERROR", str(e), 500)


@router.get("/{visitor_id}")
async def get_visitor(visitor_id: int, request: Request, db: Session = Depends(get_db)):
    """Guard/Admin: get full visitor details including visit history."""
    try:
        visitor_service = VisitorService(db)
        visitor = visitor_service.get_by_id(visitor_id)
        return success("Visitor fetched", data=visitor)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch visitor", "SERVER_ERROR", str(e), 500)


@router.post("")
async def create_visitor(request: Request, db: Session = Depends(get_db)):
    """
    Guard: register a new visitor identity.
    Separate from visitor_logs — this just creates the identity record.
    Usually called implicitly when creating a visitor log.
    """
    try:
        visitor_service = VisitorService(db)
        data    = await request.json()
        visitor = visitor_service.create(data)
        return success("Visitor registered", data=visitor.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to register visitor", "SERVER_ERROR", str(e), 500)


@router.patch("/{visitor_id}")
async def update_visitor(visitor_id: int, request: Request, db: Session = Depends(get_db)):
    """Guard/Admin: update visitor photo or details."""
    try:
        visitor_service = VisitorService(db)
        data    = await request.json()
        visitor = visitor_service.update(visitor_id, data)
        return success("Visitor updated", data=visitor.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to update visitor", "SERVER_ERROR", str(e), 500)


@router.post("/{visitor_id}/blacklist")
async def blacklist_visitor(visitor_id: int, request: Request, db: Session = Depends(get_db)):
    """Admin: blacklist a visitor. They will be blocked on all future visits."""
    try:
        visitor_service = VisitorService(db)
        data    = await request.json()
        reason  = data.get("reason", "")
        visitor = visitor_service.blacklist(visitor_id, reason)
        return success("Visitor blacklisted", data=visitor.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to blacklist visitor", "SERVER_ERROR", str(e), 500)


@router.delete("/{visitor_id}/blacklist")
async def remove_from_blacklist(visitor_id: int, request: Request, db: Session = Depends(get_db)):
    """Admin: remove a visitor from the blacklist."""
    try:
        visitor_service = VisitorService(db)
        visitor = visitor_service.remove_from_blacklist(visitor_id)
        return success("Visitor removed from blacklist", data=visitor.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to remove from blacklist", "SERVER_ERROR", str(e), 500)
