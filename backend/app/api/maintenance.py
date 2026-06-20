from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.maintenance_service import MaintenanceService
from app.repositories import FlatUserRepository
from app.utils.response import success, error
from app.utils.exceptions import AppException

router = APIRouter(prefix="/api/v1/maintenance", tags=["maintenance"])

@router.get("/my")
async def get_my_maintenance(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: get current flat validity and payment history."""
    try:
        flat_user_repo = FlatUserRepository(db)
        maintenance_service = MaintenanceService(db)
        flat_user = flat_user_repo.get_by_user(current_user.id)
        if not flat_user:
            return error("Flat not found", "NOT_FOUND", status_code=404)

        flat_status = maintenance_service.get_flat_maintenance(flat_user.flat_id)
        payments = maintenance_service.get_my_payments(flat_user.flat_id)
        
        return success("Maintenance details fetched", data={
            "flat": flat_status,
            "payments": payments
        })
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch details", "SERVER_ERROR", str(e), 500)


@router.post("/submit")
async def submit_payment(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: submit a UTR for maintenance renewal."""
    try:
        flat_user_repo = FlatUserRepository(db)
        maintenance_service = MaintenanceService(db)
        flat_user = flat_user_repo.get_by_user(current_user.id)
        if not flat_user:
            return error("Flat not found", "NOT_FOUND", status_code=404)

        data = await request.json()
        payment = maintenance_service.submit_payment(flat_user.flat_id, current_user.id, data)
        return success("Payment submitted successfully", data=payment.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to submit payment", "SERVER_ERROR", str(e), 500)


@router.get("/admin/pending")
async def admin_get_pending(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: get all pending UTRs for approval."""
    try:
        maintenance_service = MaintenanceService(db)
        payments = maintenance_service.admin_get_pending_payments()
        return success("Pending payments fetched", data=payments)
    except Exception as e:
        return error("Failed to fetch pending payments", "SERVER_ERROR", str(e), 500)


@router.get("/admin/flats")
async def admin_get_flats(request: Request, page: int = 1, per_page: int = 20, query: str = "", db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: get all flats and their validity statuses (paginated)."""
    try:
        maintenance_service = MaintenanceService(db)
        paginated_flats = maintenance_service.admin_get_all_flats(page=page, per_page=per_page, search_query=query)
        return success("Flats fetched", data=paginated_flats)
    except Exception as e:
        return error("Failed to fetch flats", "SERVER_ERROR", str(e), 500)


@router.post("/admin/approve/{payment_id}")
async def admin_approve(payment_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: approve a UTR payment."""
    try:
        maintenance_service = MaintenanceService(db)
        payment = maintenance_service.admin_approve_payment(payment_id)
        return success("Payment approved", data=payment.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to approve payment", "SERVER_ERROR", str(e), 500)


@router.post("/admin/reject/{payment_id}")
async def admin_reject(payment_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: reject a UTR payment."""
    try:
        maintenance_service = MaintenanceService(db)
        payment = maintenance_service.admin_reject_payment(payment_id)
        return success("Payment rejected", data=payment.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to reject payment", "SERVER_ERROR", str(e), 500)
