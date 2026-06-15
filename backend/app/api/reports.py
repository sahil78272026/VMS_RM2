"""
Reports Routes — /api/v1/reports
Admin-only analytics and reporting endpoints.
All reports support date range filters.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.report_service import ReportService
from app.utils.response import success, error
from app.utils.exceptions import AppException



router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

@router.get("/visitor-summary")
async def visitor_summary(request: Request, db: Session = Depends(get_db)):
    """
    Visitor count breakdown by date range.
    Query params: ?from_date=&to_date=&group_by=day|week|month
    Returns: total entries, exits, pending, denied, overdue per period.
    """
    try:
        report_service = ReportService(db)
        filters = {
            "from_date": request.query_params.get("from_date"),
            "to_date":   request.query_params.get("to_date"),
            "group_by":  request.query_params.get("group_by", "day"),
        }
        result = report_service.visitor_summary(filters)
        return success("Visitor summary fetched", data=result)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to generate report", "SERVER_ERROR", str(e), 500)


@router.get("/gate-activity")
async def gate_activity(request: Request, db: Session = Depends(get_db)):
    """
    Entries and exits per gate per day.
    Query params: ?from_date=&to_date=&gate_id=
    """
    try:
        report_service = ReportService(db)
        filters = {
            "from_date": request.query_params.get("from_date"),
            "to_date":   request.query_params.get("to_date"),
            "gate_id":   request.query_params.get("gate_id"),
        }
        result = report_service.gate_activity(filters)
        return success("Gate activity report fetched", data=result)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to generate report", "SERVER_ERROR", str(e), 500)


@router.get("/guard-performance")
async def guard_performance(request: Request, db: Session = Depends(get_db)):
    """
    Per-guard stats — entries logged, exits logged, shifts covered.
    Query params: ?from_date=&to_date=&guard_id=
    """
    try:
        report_service = ReportService(db)
        filters = {
            "from_date": request.query_params.get("from_date"),
            "to_date":   request.query_params.get("to_date"),
            "guard_id":  request.query_params.get("guard_id"),
        }
        result = report_service.guard_performance(filters)
        return success("Guard performance report fetched", data=result)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to generate report", "SERVER_ERROR", str(e), 500)


@router.get("/overdue-visitors")
async def overdue_visitors(request: Request, db: Session = Depends(get_db)):
    """
    Overstay patterns — which flats have the most overdue visitors.
    Query params: ?from_date=&to_date=
    """
    try:
        report_service = ReportService(db)
        filters = {
            "from_date": request.query_params.get("from_date"),
            "to_date":   request.query_params.get("to_date"),
        }
        result = report_service.overdue_visitors(filters)
        return success("Overdue visitor report fetched", data=result)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to generate report", "SERVER_ERROR", str(e), 500)


@router.get("/maintenance-summary")
async def maintenance_summary(request: Request, db: Session = Depends(get_db)):
    """
    Maintenance collection rate per period.
    Query params: ?schedule=monthly|quarterly|half_yearly|yearly&year=2026
    """
    try:
        report_service = ReportService(db)
        filters = {
            "schedule": request.query_params.get("schedule", "monthly"),
            "year":     request.query_params.get("year"),
        }
        result = report_service.maintenance_summary(filters)
        return success("Maintenance summary fetched", data=result)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to generate report", "SERVER_ERROR", str(e), 500)


@router.get("/flat-activity")
async def flat_activity(request: Request, db: Session = Depends(get_db)):
    """
    Most and least active flats by visitor count.
    Query params: ?from_date=&to_date=&limit=10
    """
    try:
        report_service = ReportService(db)
        filters = {
            "from_date": request.query_params.get("from_date"),
            "to_date":   request.query_params.get("to_date"),
            "limit":     int(request.query_params.get("limit", 10)),
        }
        result = report_service.flat_activity(filters)
        return success("Flat activity report fetched", data=result)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to generate report", "SERVER_ERROR", str(e), 500)
