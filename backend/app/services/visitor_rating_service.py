from sqlalchemy.orm import Session
"""
Visitor Rating Service
"""
import logging
logger = logging.getLogger(__name__)
from app.models import VisitorRating
from app.repositories import VisitorRatingRepository, VisitorLogRepository
from app.utils.exceptions import (
    NotFoundError, ValidationError, ConflictError, ForbiddenError
)


class VisitorRatingService:
    def __init__(self, db: Session):
        self.db = db
        self.repo     = VisitorRatingRepository(db)
        self.log_repo = VisitorLogRepository(db)

    def create(self, user_id: int, data: dict):
        errors = {}
        if not data.get("visitor_log_id"): errors["visitor_log_id"] = "Required"
        if not data.get("rating"):         errors["rating"]         = "Required"
        if errors:
            raise ValidationError(errors)

        rating_value = int(data["rating"])
        if rating_value < 1 or rating_value > 5:
            raise ValidationError({"rating": "Must be between 1 and 5"})

        # Verify the log exists
        log = self.log_repo.get_by_id(data["visitor_log_id"])
        if not log:
            raise NotFoundError("Visitor log")

        # Only rate completed visits
        if log.status not in ("exited", "unconfirmed_exit"):
            raise ForbiddenError("Can only rate completed visits")

        # Prevent duplicate ratings
        if self.repo.already_rated(data["visitor_log_id"], user_id):
            raise ConflictError("You have already rated this visit")

        rating = VisitorRating(
            visitor_log_id = data["visitor_log_id"],
            rated_by       = user_id,
            rating         = rating_value,
            comment        = data.get("comment"),
        )
        self.repo.save(rating)
        logger.info(
            f"[RATING] Visit {data['visitor_log_id']} rated "
            f"{rating_value}/5 by user {user_id}"
        )
        return rating

    def get_for_visitor(self, visitor_id: int):
        ratings     = self.repo.get_by_visitor(visitor_id)
        avg_rating  = self.repo.get_average_rating(visitor_id)
        return {
            "visitor_id":     visitor_id,
            "average_rating": avg_rating,
            "total_ratings":  len(ratings),
            "ratings":        [r.to_dict() for r in ratings],
        }
