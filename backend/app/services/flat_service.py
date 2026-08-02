from sqlalchemy.orm import Session
"""
Flat Service

Flats are seeded at setup or created via API for a given society.
"""
import logging
logger = logging.getLogger(__name__)
from app.models import Flat
from app.repositories import FlatRepository
from app.utils.exceptions import NotFoundError, ValidationError, DuplicateEntryError


class FlatService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = FlatRepository(db)

    def get_all(self, society_id: int = None, status: str = None, page: int = 1, per_page: int = 100):
        q = self.db.query(Flat).order_by(Flat.flat_number)
        if society_id:
            q = q.filter_by(society_id=society_id)
        if status:
            q = q.filter_by(status=status)
        return self.repo.paginate(page=page, per_page=per_page, query=q)

    def get_by_id(self, flat_id: int) -> Flat:
        flat = self.repo.get_by_id(flat_id)
        if not flat:
            raise NotFoundError("Flat")
        return flat

    def get_by_flat_number(self, flat_number: str, society_id: int = None) -> Flat:
        flat = self.repo.get_by_flat_number(flat_number, society_id=society_id)
        if not flat:
            raise NotFoundError(f"Flat {flat_number}")
        return flat

    def create(self, data: dict) -> Flat:
        flat_number = data.get("flat_number", "").strip()
        society_id = data.get("society_id", 1)

        if not flat_number:
            raise ValidationError({"flat_number": "Required"})

        if self.repo.flat_number_exists(flat_number, society_id=society_id):
            raise DuplicateEntryError(f"Flat {flat_number} already exists in this society", field="flat_number")

        flat = Flat(
            society_id=society_id,
            flat_number=flat_number,
            status=data.get("status", "vacant")
        )
        self.repo.save(flat)
        logger.info(f"[FLAT] Created flat {flat.flat_number} in society {society_id}")
        return flat

    def update_status(self, flat_id: int, status: str) -> Flat:
        """Admin updates flat status between occupied and vacant."""
        flat = self.get_by_id(flat_id)
        flat.status = status
        self.repo.save(flat)
        logger.info(
            f"[FLAT] Status updated — {flat.flat_number} → {status}"
        )
        return flat
