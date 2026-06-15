from sqlalchemy.orm import Session
"""
Flat Service

Flats are seeded at setup — not created via API.
The only write operation allowed via API is updating status (occupied/vacant).
"""
import logging
logger = logging.getLogger(__name__)
from app.repositories import FlatRepository
from app.utils.exceptions import NotFoundError, ValidationError


class FlatService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = FlatRepository(db)

    def get_all(self, status=None, page=1, per_page=100):
        from app.models import Flat
        q = self.db.query(Flat).order_by(Flat.id)
        if status:
            q = q.filter_by(status=status)
        return self.repo.paginate(page=page, per_page=per_page, query=q)

    def get_by_id(self, flat_id: int):
        flat = self.repo.get_by_id(flat_id)
        if not flat:
            raise NotFoundError("Flat")
        return flat

    def get_by_flat_number(self, flat_number: str):
        flat = self.repo.get_by_flat_number(flat_number)
        if not flat:
            raise NotFoundError(f"Flat {flat_number}")
        return flat

    def update_status(self, flat_id: int, status: str):
        """Admin updates flat status between occupied and vacant."""
        flat = self.get_by_id(flat_id)
        flat.status = status
        self.repo.save(flat)
        logger.info(
            f"[FLAT] Status updated — {flat.flat_number} → {status}"
        )
        return flat
