"""
Visitor Ratings Routes — /api/v1/visitor-ratings
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user

from app.services.visitor_rating_service import VisitorRatingService
from app.utils.response import success, error
from app.utils.exceptions import AppException



router = APIRouter(prefix="/api/v1/visitor-ratings", tags=["visitor-ratings"])

@router.post("")
async def rate_visitor(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Resident: rate a visitor after their visit ends."""
    try:
        rating_service = VisitorRatingService(db)
        user_id = current_user.id
        data    = await request.json()
        rating  = rating_service.create(user_id, data)
        return success("Visitor rated successfully", data=rating.to_dict(), status_code=201)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to submit rating", "SERVER_ERROR", str(e), 500)


@router.get("/{visitor_id}")
async def get_visitor_ratings(visitor_id: int, request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get all ratings for a visitor including average score."""
    try:
        rating_service = VisitorRatingService(db)
        result = rating_service.get_for_visitor(visitor_id)
        return success("Ratings fetched", data=result)
    except AppException as e:
        return error(e.message, e.code, e.details, e.status_code)
    except Exception as e:
        return error("Failed to fetch ratings", "SERVER_ERROR", str(e), 500)
