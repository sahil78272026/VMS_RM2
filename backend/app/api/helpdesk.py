from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.api.deps import get_current_user, get_active_society_id, require_roles
from app.services.helpdesk_service import HelpdeskService
from app.utils.response import success, error
from app.utils.exceptions import AppException

router = APIRouter(prefix="/api/v1/helpdesk", tags=["helpdesk"])

@router.get("")
async def get_society_tickets(
    request: Request,
    status: Optional[str] = Query(None),
    page: int = Query(1),
    per_page: int = Query(20),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "society_admin", "super_admin")),
    society_id: int = Depends(get_active_society_id)
):
    """Admin: Get all society tickets"""
    try:
        helpdesk_service = HelpdeskService(db)
        result = helpdesk_service.get_by_society(society_id, status, page, per_page)
        return success("Tickets fetched", data=[t.to_dict() for t in result["items"]], meta=result["meta"])
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch tickets", "SERVER_ERROR", str(e), 500)

@router.get("/my")
async def get_my_tickets(
    request: Request,
    page: int = Query(1),
    per_page: int = Query(20),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Resident: Get own tickets"""
    try:
        helpdesk_service = HelpdeskService(db)
        result = helpdesk_service.get_by_user(current_user.id, page, per_page)
        return success("My tickets fetched", data=[t.to_dict() for t in result["items"]], meta=result["meta"])
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch my tickets", "SERVER_ERROR", str(e), 500)

@router.post("")
async def create_ticket(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    society_id: int = Depends(get_active_society_id)
):
    """Resident: Create a new helpdesk ticket"""
    try:
        data = await request.json()
        helpdesk_service = HelpdeskService(db)
        ticket = helpdesk_service.create(current_user.id, society_id, data)
        return success("Ticket created", data=ticket.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to create ticket", "SERVER_ERROR", str(e), 500)

@router.patch("/{ticket_id}")
async def update_ticket(
    ticket_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Admin/Resident: Update ticket details/status"""
    try:
        data = await request.json()
        helpdesk_service = HelpdeskService(db)
        ticket = helpdesk_service.update(current_user, ticket_id, data)
        return success("Ticket updated", data=ticket.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to update ticket", "SERVER_ERROR", str(e), 500)
