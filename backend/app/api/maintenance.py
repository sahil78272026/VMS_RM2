"""
Maintenance Routes — /api/v1/maintenance
Admin generates bills. Residents view and pay.
"""

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
async def get_my_bills(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: view all bills for their flat."""
    try:
        flat_user_repo = FlatUserRepository(db)
        maintenance_service = MaintenanceService(db)
        user_id   = current_user.id
        flat_user = flat_user_repo.get_by_user(user_id)
        if not flat_user:
            return error("Flat not found", "NOT_FOUND", status_code=404)

        bills = maintenance_service.get_by_flat(flat_user.flat_id)
        return success("Bills fetched", data=[b.to_dict() for b in bills])
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch bills", "SERVER_ERROR", str(e), 500)


@router.get("/{bill_id}")
async def get_bill(bill_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get a single bill's details."""
    try:
        flat_user_repo = FlatUserRepository(db)
        maintenance_service = MaintenanceService(db)
        bill = maintenance_service.get_by_id(bill_id)
        return success("Bill fetched", data=bill.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch bill", "SERVER_ERROR", str(e), 500)


@router.post("")
async def generate_bills(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Admin: generate maintenance bills.
    Can generate for a single flat or all flats at once.
    Body: { flat_id (optional), bill_period, schedule, amount, due_date }
    If flat_id is omitted — generates for ALL occupied flats.
    """
    try:
        flat_user_repo = FlatUserRepository(db)
        maintenance_service = MaintenanceService(db)
        data  = await request.json()
        bills = maintenance_service.generate(data)
        return success(
            f"{len(bills)} bill(s) generated successfully",
            data=[b.to_dict() for b in bills],
            status_code=201
        )
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to generate bills", "SERVER_ERROR", str(e), 500)


@router.patch("/{bill_id}/pay")
async def pay_bill(bill_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Resident: record a payment for a bill.
    Body: { payment_mode, transaction_ref, amount_paid }
    """
    try:
        flat_user_repo = FlatUserRepository(db)
        maintenance_service = MaintenanceService(db)
        user_id = current_user.id
        data    = await request.json()
        bill    = maintenance_service.pay(bill_id, user_id, data)
        return success("Payment recorded successfully", data=bill.to_dict())
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to record payment", "SERVER_ERROR", str(e), 500)


@router.get("")
async def get_all_bills(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: all bills with optional filters."""
    try:
        flat_user_repo = FlatUserRepository(db)
        maintenance_service = MaintenanceService(db)
        flat_id  = request.query_params.get("flat_id")
        status   = request.query_params.get("status")
        schedule = request.query_params.get("schedule")
        page     = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 20))

        result = maintenance_service.get_all(
            flat_id=flat_id,
            status=status,
            schedule=schedule,
            page=page,
            per_page=per_page
        )
        return success(
            "Bills fetched",
            data=[b.to_dict() for b in result["items"]],
            meta=result["meta"]
        )
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch bills", "SERVER_ERROR", str(e), 500)


@router.get("/overdue")
async def get_overdue_bills(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Admin: all overdue bills."""
    try:
        flat_user_repo = FlatUserRepository(db)
        maintenance_service = MaintenanceService(db)
        bills = maintenance_service.get_overdue()
        return success("Overdue bills fetched", data=[b.to_dict() for b in bills])
    except Exception as e:
        return error("Failed to fetch overdue bills", "SERVER_ERROR", str(e), 500)
