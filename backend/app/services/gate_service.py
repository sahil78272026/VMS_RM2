from sqlalchemy.orm import Session
"""
Gate Service
"""
import logging
logger = logging.getLogger(__name__)
from app.models import Gate
from app.repositories import GateRepository
from app.utils.exceptions import NotFoundError, ValidationError


class GateService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = GateRepository(db)

    def get_all(self, society_id: int = None):
        return self.repo.get_all_by_society(society_id)

    def get_by_id(self, gate_id: int):
        gate = self.repo.get_by_id(gate_id)
        if not gate:
            raise NotFoundError("Gate")
        return gate

    def create(self, data: dict):
        errors = {}
        if not data.get("name"): errors["name"] = "Required"
        if not data.get("type"): errors["type"] = "Required"
        if errors:
            raise ValidationError(errors)

        gate = Gate(
            society_id = data.get("society_id", 1),
            name       = data["name"].strip(),
            type       = data["type"],
            status     = data.get("status", "active"),
        )
        self.repo.save(gate)
        logger.info(f"[GATE] Created: {gate.name} in society {gate.society_id}")
        return gate

    def update(self, gate_id: int, data: dict):
        gate = self.get_by_id(gate_id)
        if data.get("name"):   gate.name   = data["name"]
        if data.get("type"):   gate.type   = data["type"]
        if data.get("status"): gate.status = data["status"]
        self.repo.save(gate)
        return gate
