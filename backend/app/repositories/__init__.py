"""
Domain repositories — specific query methods for each model.
All DB queries live here. Services call repositories, never SQLAlchemy directly.
"""

from datetime import datetime
from app.repositories.base import BaseRepository
from app.models import (
    User, Flat, FlatUser, Guard, Visitor, VisitorLog,
    Gate, GateSession, PreApproval, FrequentPass,
    VisitorRating, Notification, PanicAlert,
    MaintenanceBill, Announcement
)


# ── User Repository ────────────────────────────────────────────────────────

class UserRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(User, db)

    def get_by_phone(self, phone: str):
        print("self.db.query(User).filter_by(phone=phone).first():", self.db.query(User).filter_by(phone=phone).first())
        return self.db.query(User).filter_by(phone=phone).first()

    def get_by_email(self, email: str):
        return self.db.query(User).filter_by(email=email).first()

    def get_by_role(self, role: str):
        return self.db.query(User).filter_by(role=role).all()

    def get_active_by_role(self, role: str):
        return self.db.query(User).filter_by(role=role, status="active").all()

    def phone_exists(self, phone: str, exclude_id: int = None):
        q = self.db.query(User).filter_by(phone=phone)
        if exclude_id:
            q = q.filter(User.id != exclude_id)
        return q.first() is not None

    def email_exists(self, email: str, exclude_id: int = None):
        q = self.db.query(User).filter_by(email=email)
        if exclude_id:
            q = q.filter(User.id != exclude_id)
        return q.first() is not None


# ── Flat Repository ────────────────────────────────────────────────────────

class FlatRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(Flat, db)

    def get_by_flat_number(self, flat_number: str):
        return self.db.query(Flat).filter_by(flat_number=flat_number).first()

    def get_occupied(self):
        return self.db.query(Flat).filter_by(status="occupied").all()

    def get_vacant(self):
        return self.db.query(Flat).filter_by(status="vacant").all()

    def flat_number_exists(self, flat_number: str, exclude_id: int = None):
        q = self.db.query(Flat).filter_by(flat_number=flat_number)
        if exclude_id:
            q = q.filter(Flat.id != exclude_id)
        return q.first() is not None


# ── Flat User Repository ───────────────────────────────────────────────────

class FlatUserRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(FlatUser, db)

    def get_primary_by_flat(self, flat_id: int):
        return self.db.query(FlatUser).filter_by(flat_id=flat_id, role="primary").first()

    def get_all_primaries_by_flat(self, flat_id: int):
        """Get ALL primary members of a flat (there can be more than one)."""
        return self.db.query(FlatUser).filter_by(flat_id=flat_id, role="primary").all()

    def get_all_by_flat(self, flat_id: int):
        return self.db.query(FlatUser).filter_by(flat_id=flat_id).all()

    def get_by_user(self, user_id: int):
        return self.db.query(FlatUser).filter_by(user_id=user_id).first()

    def get_approvers_by_flat(self, flat_id: int):
        """Get flat users who can approve — only primary members."""
        return self.db.query(FlatUser).filter_by(flat_id=flat_id, role="primary").all()

    def get_active_by_flat(self, flat_id: int):
        """Only residents who haven't moved out."""
        return self.db.query(FlatUser).filter_by(flat_id=flat_id).filter(
            FlatUser.move_out_date.is_(None)
        ).all()


# ── Guard Repository ───────────────────────────────────────────────────────

class GuardRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(Guard, db)

    def get_by_user(self, user_id: int):
        return self.db.query(Guard).filter_by(user_id=user_id).first()

    def get_by_employee_id(self, employee_id: str):
        return self.db.query(Guard).filter_by(employee_id=employee_id).first()

    def employee_id_exists(self, employee_id: str, exclude_id: int = None):
        q = self.db.query(Guard).filter_by(employee_id=employee_id)
        if exclude_id:
            q = q.filter(Guard.id != exclude_id)
        return q.first() is not None


# ── Gate Repository ────────────────────────────────────────────────────────

class GateRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(Gate, db)

    def get_active(self):
        return self.db.query(Gate).filter_by(status="active").all()

    def get_entry_gates(self):
        return self.db.query(Gate).filter(
            Gate.status == "active",
            Gate.type.in_(["entry_only", "both"])
        ).all()

    def get_exit_gates(self):
        return self.db.query(Gate).filter(
            Gate.status == "active",
            Gate.type.in_(["exit_only", "both"])
        ).all()


# ── Gate Session Repository ────────────────────────────────────────────────

class GateSessionRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(GateSession, db)

    def get_active_by_guard(self, guard_id: int):
        """Get the currently open shift for a guard."""
        return self.db.query(GateSession).filter_by(
            guard_id=guard_id,
            shift_end=None
        ).first()

    def get_active_by_gate(self, gate_id: int):
        """Get all currently active sessions at a gate."""
        return self.db.query(GateSession).filter_by(
            gate_id=gate_id,
            shift_end=None
        ).all()

    def get_all_active(self):
        return self.db.query(GateSession).filter_by(shift_end=None).all()

    def get_by_guard(self, guard_id: int):
        return self.db.query(GateSession).filter_by(guard_id=guard_id).order_by(
            GateSession.shift_start.desc()
        ).all()


# ── Visitor Repository ─────────────────────────────────────────────────────

class VisitorRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(Visitor, db)

    def get_by_phone(self, phone: str):
        return self.db.query(Visitor).filter_by(phone=phone).first()

    def search(self, query: str):
        """Search by name or phone."""
        return self.db.query(Visitor).filter(
            (Visitor.name.ilike(f"%{query}%")) |
            (Visitor.phone.ilike(f"%{query}%"))
        ).all()

    def get_blacklisted(self):
        return self.db.query(Visitor).filter_by(is_blacklisted=True).all()

    def is_blacklisted(self, phone: str) -> bool:
        v = self.get_by_phone(phone)
        return v.is_blacklisted if v else False


# ── Visitor Log Repository ─────────────────────────────────────────────────

class VisitorLogRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(VisitorLog, db)

    def get_pending_for_flat(self, flat_id: int):
        return self.db.query(VisitorLog).filter_by(
            flat_id=flat_id,
            approval_status="pending"
        ).order_by(VisitorLog.created_at.desc()).all()

    def get_inside(self):
        """Everyone currently inside the society."""
        return self.db.query(VisitorLog).filter_by(status="inside").all()

    def get_inside_for_gate(self, gate_id: int):
        """Visitors expected to exit from a specific gate."""
        return self.db.query(VisitorLog).filter_by(
            status="inside",
            expected_exit_gate_id=gate_id
        ).all()

    def get_overdue(self):
        """Visitors whose expected exit time has passed."""
        return self.db.query(VisitorLog).filter(
            VisitorLog.status == "inside",
            VisitorLog.expected_exit_by < datetime.utcnow()
        ).all()

    def get_by_flat(self, flat_id: int, page: int = 1, per_page: int = 20):
        q = self.db.query(VisitorLog).filter_by(flat_id=flat_id).order_by(
            VisitorLog.created_at.desc()
        )
        return self.paginate(page=page, per_page=per_page, query=q)

    def get_today_for_gate(self, gate_id: int):
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        return self.db.query(VisitorLog).filter(
            VisitorLog.entry_gate_id == gate_id,
            VisitorLog.created_at >= today_start
        ).order_by(VisitorLog.created_at.desc()).all()

    def get_all_filtered(self, filters: dict, page: int = 1, per_page: int = 20):
        q = self.db.query(VisitorLog)
        if filters.get("status"):
            q = q.filter_by(status=filters["status"])
        if filters.get("flat_id"):
            q = q.filter_by(flat_id=filters["flat_id"])
        if filters.get("from_date"):
            q = q.filter(VisitorLog.created_at >= filters["from_date"])
        if filters.get("to_date"):
            q = q.filter(VisitorLog.created_at <= filters["to_date"])
        q = q.order_by(VisitorLog.created_at.desc())
        return self.paginate(page=page, per_page=per_page, query=q)


# ── Pre Approval Repository ────────────────────────────────────────────────

class PreApprovalRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(PreApproval, db)

    def get_active_by_flat_user(self, flat_user_id: int):
        return self.db.query(PreApproval).filter_by(
            flat_user_id=flat_user_id, status="active"
        ).all()

    def find_valid(self, phone: str, flat_id: int):
        """Check if visitor has a valid pre-approval for this flat right now."""
        now = datetime.utcnow()
        from app.models import FlatUser
        return self.db.query(PreApproval).join(FlatUser).filter(
            PreApproval.visitor_phone == phone,
            FlatUser.flat_id == flat_id,
            PreApproval.status == "active",
            PreApproval.valid_from <= now,
            PreApproval.valid_until >= now,
        ).first()


# ── Frequent Pass Repository ───────────────────────────────────────────────

class FrequentPassRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(FrequentPass, db)

    def get_active_by_flat_user(self, flat_user_id: int):
        return self.db.query(FrequentPass).filter_by(
            flat_user_id=flat_user_id, status="active"
        ).all()

    def find_valid(self, visitor_id: int, flat_id: int):
        """Check if a frequent pass is valid right now for this visitor and flat."""
        from datetime import date, datetime
        from app.models import FlatUser
        today      = date.today()
        now_time   = datetime.utcnow().time()
        day_name   = today.strftime("%a").lower()  # "mon", "tue" etc.

        passes = self.db.query(FrequentPass).join(FlatUser).filter(
            FrequentPass.visitor_id == visitor_id,
            FlatUser.flat_id == flat_id,
            FrequentPass.status == "active",
            FrequentPass.valid_from <= today,
            (FrequentPass.valid_until >= today) | (FrequentPass.valid_until.is_(None)),
            FrequentPass.allowed_from <= now_time,
            FrequentPass.allowed_until >= now_time,
        ).all()

        # Filter by allowed days
        for p in passes:
            if day_name in p.allowed_days.split(","):
                return p
        return None


# ── Notification Repository ────────────────────────────────────────────────

class NotificationRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(Notification, db)

    def get_by_user(self, user_id: int, page: int = 1, per_page: int = 20):
        q = self.db.query(Notification).filter_by(user_id=user_id).order_by(
            Notification.sent_at.desc()
        )
        return self.paginate(page=page, per_page=per_page, query=q)

    def get_unread_count(self, user_id: int):
        return self.db.query(Notification).filter_by(
            user_id=user_id, status="sent"
        ).count()


# ── Panic Alert Repository ─────────────────────────────────────────────────

class PanicAlertRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(PanicAlert, db)

    def get_active(self):
        return self.db.query(PanicAlert).filter_by(status="active").order_by(
            PanicAlert.created_at.desc()
        ).all()

    def has_active_for_user(self, user_id: int) -> bool:
        return self.db.query(PanicAlert).filter_by(
            triggered_by=user_id, status="active"
        ).first() is not None


# ── Maintenance Bill Repository ────────────────────────────────────────────

class MaintenanceBillRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(MaintenanceBill, db)

    def get_by_flat(self, flat_id: int):
        return self.db.query(MaintenanceBill).filter_by(flat_id=flat_id).order_by(
            MaintenanceBill.generated_at.desc()
        ).all()

    def get_overdue(self):
        return self.db.query(MaintenanceBill).filter_by(status="overdue").all()

    def get_unpaid_for_flat(self, flat_id: int):
        return self.db.query(MaintenanceBill).filter(
            MaintenanceBill.flat_id == flat_id,
            MaintenanceBill.status.in_(["unpaid", "overdue"])
        ).all()

    def period_exists(self, flat_id: int, bill_period: str) -> bool:
        return self.db.query(MaintenanceBill).filter_by(
            flat_id=flat_id, bill_period=bill_period
        ).first() is not None


# ── Announcement Repository ────────────────────────────────────────────────

class AnnouncementRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(Announcement, db)

    def get_active(self, page: int = 1, per_page: int = 20):
        """Active = not expired."""
        now = datetime.utcnow()
        q = self.db.query(Announcement).filter(
            (Announcement.expires_at.is_(None)) |
            (Announcement.expires_at > now)
        ).order_by(
            Announcement.priority.desc(),
            Announcement.created_at.desc()
        )
        return self.paginate(page=page, per_page=per_page, query=q)

    def get_urgent(self):
        now = datetime.utcnow()
        return self.db.query(Announcement).filter(
            Announcement.priority == "urgent",
            (Announcement.expires_at.is_(None)) | (Announcement.expires_at > now)
        ).all()


# ── Visitor Rating Repository ──────────────────────────────────────────────

class VisitorRatingRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(VisitorRating, db)

    def get_by_visitor(self, visitor_id: int):
        return self.db.query(VisitorRating).join(VisitorLog).filter(
            VisitorLog.visitor_id == visitor_id
        ).all()

    def already_rated(self, visitor_log_id: int, user_id: int) -> bool:
        return self.db.query(VisitorRating).filter_by(
            visitor_log_id=visitor_log_id,
            rated_by=user_id
        ).first() is not None

    def get_average_rating(self, visitor_id: int) -> float:
        from sqlalchemy import func
        result = self.db.query(VisitorRating).join(VisitorLog).filter(
            VisitorLog.visitor_id == visitor_id
        ).with_entities(func.avg(VisitorRating.rating)).scalar()
        return round(float(result), 1) if result else None
