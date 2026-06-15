from sqlalchemy.orm import Session
"""
Report Service — admin analytics derived from visitor_logs and other tables.
All reports are computed on the fly — no separate report tables needed.
"""

from datetime import datetime, date, timedelta
from sqlalchemy import func, case
import logging
logger = logging.getLogger(__name__)

from app.models import (
    VisitorLog, Gate, Guard, GateSession, Flat,
    FlatUser, MaintenanceBill
)


class ReportService:
    def __init__(self, db: Session):
        self.db = db


    def _parse_dates(self, filters: dict):
        """Parse from_date and to_date from filter strings."""
        from_date = (
            datetime.fromisoformat(filters["from_date"])
            if filters.get("from_date")
            else datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
        )
        to_date = (
            datetime.fromisoformat(filters["to_date"])
            if filters.get("to_date")
            else datetime.utcnow()
        )
        return from_date, to_date

    def visitor_summary(self, filters: dict):
        """
        Visitor count breakdown by date range.
        Returns total entries, exits, pending, denied, overdue.
        """
        from_date, to_date = self._parse_dates(filters)

        base_q = self.db.query(VisitorLog).filter(
            VisitorLog.created_at >= from_date,
            VisitorLog.created_at <= to_date,
        )

        total     = base_q.count()
        approved  = base_q.filter(VisitorLog.status.in_(["inside", "exited", "unconfirmed_exit"])).count()
        denied    = base_q.filter_by(approval_status="denied").count()
        pending   = base_q.filter_by(approval_status="pending").count()
        overdue   = base_q.filter_by(status="overdue").count()
        exited    = base_q.filter_by(status="exited").count()
        self_ci   = base_q.filter_by(approval_source="self_checkin").count()

        # Entry mode breakdown
        foot      = base_q.filter_by(entry_mode="foot").count()
        two_w     = base_q.filter_by(entry_mode="two_wheeler").count()
        four_w    = base_q.filter_by(entry_mode="four_wheeler").count()

        # Purpose breakdown
        purposes  = self.db.query(
            VisitorLog.purpose,
            func.count(VisitorLog.id).label("count")
        ).filter(
            VisitorLog.created_at >= from_date,
            VisitorLog.created_at <= to_date,
        ).group_by(VisitorLog.purpose).all()

        return {
            "period": {
                "from": from_date.isoformat(),
                "to":   to_date.isoformat(),
            },
            "totals": {
                "total":           total,
                "approved":        approved,
                "denied":          denied,
                "pending":         pending,
                "overdue":         overdue,
                "exited":          exited,
                "self_checkins":   self_ci,
            },
            "entry_mode": {
                "foot":         foot,
                "two_wheeler":  two_w,
                "four_wheeler": four_w,
            },
            "by_purpose": [
                {"purpose": p.purpose, "count": p.count}
                for p in purposes
            ],
        }

    def gate_activity(self, filters: dict):
        """Entries and exits per gate per day."""
        from_date, to_date = self._parse_dates(filters)
        gate_id = filters.get("gate_id")

        gates = self.db.query(Gate).filter_by(status="active").all()
        result = []

        for gate in gates:
            if gate_id and str(gate.id) != str(gate_id):
                continue

            entries = self.db.query(VisitorLog).filter(
                VisitorLog.entry_gate_id == gate.id,
                VisitorLog.entered_at >= from_date,
                VisitorLog.entered_at <= to_date,
            ).count()

            exits = self.db.query(VisitorLog).filter(
                VisitorLog.actual_exit_gate_id == gate.id,
                VisitorLog.actual_exit_at >= from_date,
                VisitorLog.actual_exit_at <= to_date,
            ).count()

            result.append({
                "gate_id":   gate.id,
                "gate_name": gate.name,
                "gate_type": gate.type,
                "entries":   entries,
                "exits":     exits,
            })

        return result

    def guard_performance(self, filters: dict):
        """Per-guard stats for a given period."""
        from_date, to_date = self._parse_dates(filters)
        guard_id = filters.get("guard_id")

        guards = self.db.query(Guard).all()
        result = []

        for guard in guards:
            if guard_id and str(guard.id) != str(guard_id):
                continue

            # Entries this guard logged
            entries = self.db.query(VisitorLog).filter(
                VisitorLog.registered_by_guard == guard.id,
                VisitorLog.entered_at >= from_date,
                VisitorLog.entered_at <= to_date,
            ).count()

            # Shifts this guard worked
            shifts = self.db.query(GateSession).filter(
                GateSession.guard_id == guard.id,
                GateSession.shift_start >= from_date,
                GateSession.shift_start <= to_date,
            ).count()

            # Total hours on duty
            sessions = self.db.query(GateSession).filter(
                GateSession.guard_id == guard.id,
                GateSession.shift_start >= from_date,
                GateSession.shift_end <= to_date,
                GateSession.shift_end.isnot(None),
            ).all()

            total_hours = sum(
                (s.shift_end - s.shift_start).total_seconds() / 3600
                for s in sessions
            )

            result.append({
                "guard_id":    guard.id,
                "name":        guard.user.name if guard.user else "Unknown",
                "employee_id": guard.employee_id,
                "shift":       guard.shift,
                "entries_logged": entries,
                "shifts_worked":  shifts,
                "total_hours_on_duty": round(total_hours, 1),
            })

        return result

    def overdue_visitors(self, filters: dict):
        """Overstay patterns — flats with most overdue visitors."""
        from_date, to_date = self._parse_dates(filters)

        results = self.db.query(
            VisitorLog.flat_id,
            func.count(VisitorLog.id).label("overdue_count"),
        ).filter(
            VisitorLog.status == "overdue",
            VisitorLog.created_at >= from_date,
            VisitorLog.created_at <= to_date,
        ).group_by(VisitorLog.flat_id).order_by(
            func.count(VisitorLog.id).desc()
        ).all()

        data = []
        for r in results:
            flat = self.db.query(Flat).get(r.flat_id)
            data.append({
                "flat_id":      r.flat_id,
                "flat_number":  flat.flat_number if flat else "Unknown",
                "overdue_count": r.overdue_count,
            })

        return {
            "period": {
                "from": from_date.isoformat(),
                "to":   to_date.isoformat(),
            },
            "overdue_by_flat": data,
            "total_overdue":   sum(r.overdue_count for r in results),
        }

    def maintenance_summary(self, filters: dict):
        """Maintenance collection rate per schedule."""
        schedule = filters.get("schedule", "monthly")
        year     = filters.get("year", str(date.today().year))

        bills = self.db.query(MaintenanceBill).filter_by(schedule=schedule).filter(
            MaintenanceBill.bill_period.like(f"{year}%")
        ).all()

        total_amount  = sum(float(b.amount) for b in bills)
        paid_amount   = sum(float(b.amount_paid or 0) for b in bills if b.status == "paid")
        total_bills   = len(bills)
        paid_count    = sum(1 for b in bills if b.status == "paid")
        unpaid_count  = sum(1 for b in bills if b.status == "unpaid")
        overdue_count = sum(1 for b in bills if b.status == "overdue")

        return {
            "schedule":         schedule,
            "year":             year,
            "total_bills":      total_bills,
            "paid":             paid_count,
            "unpaid":           unpaid_count,
            "overdue":          overdue_count,
            "total_amount":     round(total_amount, 2),
            "collected_amount": round(paid_amount, 2),
            "collection_rate":  round((paid_amount / total_amount * 100) if total_amount else 0, 1),
        }

    def flat_activity(self, filters: dict):
        """Most and least active flats by visitor count."""
        from_date, to_date = self._parse_dates(filters)
        limit = filters.get("limit", 10)

        results = self.db.query(
            VisitorLog.flat_id,
            func.count(VisitorLog.id).label("visitor_count"),
        ).filter(
            VisitorLog.created_at >= from_date,
            VisitorLog.created_at <= to_date,
        ).group_by(VisitorLog.flat_id).order_by(
            func.count(VisitorLog.id).desc()
        ).limit(limit).all()

        data = []
        for r in results:
            flat = self.db.query(Flat).get(r.flat_id)
            data.append({
                "flat_id":       r.flat_id,
                "flat_number":   flat.flat_number if flat else "Unknown",
                "visitor_count": r.visitor_count,
            })

        return {
            "period": {
                "from": from_date.isoformat(),
                "to":   to_date.isoformat(),
            },
            "most_active_flats": data,
        }
