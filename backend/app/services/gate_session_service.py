from sqlalchemy.orm import Session
"""
Gate Session Service — manages guard shifts at gates.
"""

from datetime import datetime
import logging
logger = logging.getLogger(__name__)
from app.models import GateSession, VisitorLog
from app.repositories import GateSessionRepository, GateRepository
from app.utils.exceptions import (
    NotFoundError, ValidationError, ConflictError, ShiftNotActiveError
)


class GateSessionService:
    def __init__(self, db: Session):
        self.db = db
        self.repo      = GateSessionRepository(db)
        self.gate_repo = GateRepository(db)

    def start_shift(self, guard_id: int, gate_id: int):
        """
        Guard starts shift at a specific gate.
        Closes any lingering open session first (safety net).
        """
        if not gate_id:
            raise ValidationError({"gate_id": "Gate ID is required to start shift"})

        gate = self.gate_repo.get_by_id(gate_id)
        if not gate or gate.status != "active":
            raise NotFoundError("Active gate")

        # Close any existing open session for this guard (safety net)
        existing = self.repo.get_active_by_guard(guard_id)
        if existing:
            existing.shift_end = datetime.utcnow()
            self.repo.save(existing)
            logger.warning(f"[GATE_SESSION] Force-closed previous session for guard {guard_id}")

        session = GateSession(
            guard_id    = guard_id,
            gate_id     = gate_id,
            shift_start = datetime.utcnow(),
        )
        self.repo.save(session)
        logger.info(f"[GATE_SESSION] Shift started — guard {guard_id} at gate {gate_id}")
        return session

    def end_shift(self, guard_id: int):
        """Guard ends their current shift."""
        session = self.repo.get_active_by_guard(guard_id)
        if not session:
            raise ShiftNotActiveError()

        session.shift_end = datetime.utcnow()
        self.repo.save(session)
        logger.info(f"[GATE_SESSION] Shift ended — guard {guard_id}")
        return session

    def get_active(self):
        return self.repo.get_all_active()

    def get_by_guard(self, guard_id: int):
        return self.repo.get_by_guard(guard_id)

    def get_all(self, guard_id=None, gate_id=None, page=1, per_page=20):
        from app.models import GateSession
        q = self.db.query(GateSession)
        if guard_id: q = q.filter_by(guard_id=guard_id)
        if gate_id:  q = q.filter_by(gate_id=gate_id)
        q = q.order_by(GateSession.shift_start.desc())
        return self.repo.paginate(page=page, per_page=per_page, query=q)

    def get_with_stats(self, session_id: int):
        """Get session details with entry/exit counts derived from visitor_logs."""
        session = self.repo.get_by_id(session_id)
        if not session:
            raise NotFoundError("Gate session")

        shift_end = session.shift_end or datetime.utcnow()

        entries = self.db.query(VisitorLog).filter(
            VisitorLog.entry_gate_id == session.gate_id,
            VisitorLog.entered_at >= session.shift_start,
            VisitorLog.entered_at <= shift_end,
        ).count()

        exits = self.db.query(VisitorLog).filter(
            VisitorLog.actual_exit_gate_id == session.gate_id,
            VisitorLog.actual_exit_at >= session.shift_start,
            VisitorLog.actual_exit_at <= shift_end,
        ).count()

        data = session.to_dict()
        data["stats"] = {
            "entries_logged": entries,
            "exits_logged":   exits,
        }
        return data
