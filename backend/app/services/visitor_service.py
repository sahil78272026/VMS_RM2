from sqlalchemy.orm import Session
"""
Visitor Service
"""
import logging
logger = logging.getLogger(__name__)
from app.models import Visitor
from app.repositories import VisitorRepository
from app.utils.exceptions import NotFoundError, ValidationError


class VisitorService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = VisitorRepository(db)

    def search(self, query: str, page=1, per_page=20):
        from app.models import Visitor
        if query:
            q = self.db.query(Visitor).filter(
                (Visitor.name.ilike(f"%{query}%")) |
                (Visitor.phone.ilike(f"%{query}%"))
            )
        else:
            q = self.db.query(Visitor)
        q = q.order_by(Visitor.created_at.desc())
        return self.repo.paginate(page=page, per_page=per_page, query=q)

    def get_by_id(self, visitor_id):
        from app.repositories import VisitorRatingRepository
        visitor = self.repo.get_by_id(visitor_id)
        if not visitor:
            raise NotFoundError("Visitor")

        rating_repo = VisitorRatingRepository(db)
        avg_rating  = rating_repo.get_average_rating(visitor_id)
        all_ratings = rating_repo.get_by_visitor(visitor_id)

        data = visitor.to_dict()
        data["average_rating"] = avg_rating
        data["ratings"]        = [r.to_dict() for r in all_ratings]
        data["visit_count"]    = visitor.visitor_logs.count()
        return data

    def create(self, data):
        errors = {}
        if not data.get("name"):  errors["name"]  = "Required"
        if not data.get("phone"): errors["phone"] = "Required"
        if errors:
            raise ValidationError(errors)

        existing = self.repo.get_by_phone(data["phone"])
        if existing:
            return existing  # Return existing visitor instead of creating duplicate

        visitor = Visitor(
            name  = data["name"].strip(),
            phone = data["phone"].strip(),
        )
        self.repo.save(visitor)
        return visitor

    def update(self, visitor_id, data):
        visitor = self.repo.get_by_id(visitor_id)
        if not visitor:
            raise NotFoundError("Visitor")
        if data.get("photo_url"):    visitor.photo_url    = data["photo_url"]
        if data.get("id_proof_url"): visitor.id_proof_url = data["id_proof_url"]
        if data.get("name"):         visitor.name         = data["name"]
        self.repo.save(visitor)
        return visitor

    def blacklist(self, visitor_id, reason: str):
        visitor = self.repo.get_by_id(visitor_id)
        if not visitor:
            raise NotFoundError("Visitor")
        visitor.is_blacklisted   = True
        visitor.blacklist_reason = reason
        self.repo.save(visitor)
        logger.warning(f"[VISITOR] Blacklisted: {visitor_id} — reason: {reason}")
        return visitor

    def remove_from_blacklist(self, visitor_id):
        visitor = self.repo.get_by_id(visitor_id)
        if not visitor:
            raise NotFoundError("Visitor")
        visitor.is_blacklisted   = False
        visitor.blacklist_reason = None
        self.repo.save(visitor)
        logger.info(f"[VISITOR] Removed from blacklist: {visitor_id}")
        return visitor
