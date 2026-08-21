"""
Domain repositories — specific query methods for each model.
All DB queries live here. Services call repositories, never SQLAlchemy directly.
Includes multi-tenancy scoping by society_id across all tenant models.
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from app.repositories.base import BaseRepository
from app.models import (
    Society, SocietyAdmin, User, Flat, FlatUser, Guard, Visitor, VisitorLog,
    Gate, GateSession, PreApproval, FrequentPass,
    VisitorRating, Notification, PanicAlert,
    MaintenanceBill, MaintenancePayment, Announcement
)


# ── Society Repository ─────────────────────────────────────────────────────

class SocietyRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(Society, db)

    def get_by_slug(self, slug: str) -> Optional[Society]:
        return self.db.query(Society).filter_by(slug=slug).first()

    def slug_exists(self, slug: str, exclude_id: int = None) -> bool:
        q = self.db.query(Society).filter_by(slug=slug)
        if exclude_id:
            q = q.filter(Society.id != exclude_id)
        return q.first() is not None

    def get_all_active(self) -> List[Society]:
        return self.db.query(Society).filter_by(status="active").order_by(Society.name).all()

    def get_user_societies(self, user_id: int) -> List[Society]:
        """Return all societies a user has access to (via SocietyAdmin or FlatUser or Guard)."""
        society_ids = []
        # As society admin (most recent first)
        for sa in self.db.query(SocietyAdmin).filter_by(user_id=user_id).order_by(SocietyAdmin.id.desc()).all():
            if sa.society_id not in society_ids:
                society_ids.append(sa.society_id)
        # As resident
        for fu in self.db.query(FlatUser).filter_by(user_id=user_id).order_by(FlatUser.id.desc()).all():
            if fu.society_id not in society_ids:
                society_ids.append(fu.society_id)
        # As guard
        for g in self.db.query(Guard).filter_by(user_id=user_id).order_by(Guard.id.desc()).all():
            if g.society_id not in society_ids:
                society_ids.append(g.society_id)

        if not society_ids:
            return []
        
        soc_map = {s.id: s for s in self.db.query(Society).filter(Society.id.in_(society_ids)).all()}
        return [soc_map[sid] for sid in society_ids if sid in soc_map]


# ── Society Admin Repository ───────────────────────────────────────────────

class SocietyAdminRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(SocietyAdmin, db)

    def get_by_society_and_user(self, society_id: int, user_id: int) -> Optional[SocietyAdmin]:
        return self.db.query(SocietyAdmin).filter_by(society_id=society_id, user_id=user_id).first()

    def get_admins_by_society(self, society_id: int) -> List[SocietyAdmin]:
        return self.db.query(SocietyAdmin).options(joinedload(SocietyAdmin.user)).filter_by(society_id=society_id).all()

    def is_admin(self, society_id: int, user_id: int) -> bool:
        return self.db.query(SocietyAdmin).filter_by(society_id=society_id, user_id=user_id).first() is not None


# ── User Repository ────────────────────────────────────────────────────────

class UserRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(User, db)

    def get_by_phone(self, phone: str) -> Optional[User]:
        return self.db.query(User).filter_by(phone=phone).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter_by(email=email).first()

    def get_by_role(self, role: str) -> List[User]:
        return self.db.query(User).filter_by(role=role).all()

    def get_active_by_role(self, role: str) -> List[User]:
        return self.db.query(User).filter_by(role=role, status="active").all()

    def phone_exists(self, phone: str, exclude_id: int = None) -> bool:
        q = self.db.query(User).filter_by(phone=phone)
        if exclude_id:
            q = q.filter(User.id != exclude_id)
        return q.first() is not None

    def email_exists(self, email: str, exclude_id: int = None) -> bool:
        q = self.db.query(User).filter_by(email=email)
        if exclude_id:
            q = q.filter(User.id != exclude_id)
        return q.first() is not None


# ── Flat Repository ────────────────────────────────────────────────────────

class FlatRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(Flat, db)

    def get_by_flat_number(self, flat_number: str, society_id: int = None) -> Optional[Flat]:
        q = self.db.query(Flat).filter_by(flat_number=flat_number)
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.first()

    def get_all_by_society(self, society_id: int = None, status: str = None) -> List[Flat]:
        q = self.db.query(Flat)
        if society_id:
            q = q.filter_by(society_id=society_id)
        if status:
            q = q.filter_by(status=status)
        return q.order_by(Flat.flat_number).all()

    def get_occupied(self, society_id: int = None) -> List[Flat]:
        q = self.db.query(Flat).filter_by(status="occupied")
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.all()

    def get_vacant(self, society_id: int = None) -> List[Flat]:
        q = self.db.query(Flat).filter_by(status="vacant")
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.all()

    def flat_number_exists(self, flat_number: str, society_id: int = None, exclude_id: int = None) -> bool:
        q = self.db.query(Flat).filter_by(flat_number=flat_number)
        if society_id:
            q = q.filter_by(society_id=society_id)
        if exclude_id:
            q = q.filter(Flat.id != exclude_id)
        return q.first() is not None


# ── Flat User Repository ───────────────────────────────────────────────────

class FlatUserRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(FlatUser, db)

    def get_primary_by_flat(self, flat_id: int) -> Optional[FlatUser]:
        return self.db.query(FlatUser).filter_by(flat_id=flat_id, role="primary").first()

    def get_all_primaries_by_flat(self, flat_id: int) -> List[FlatUser]:
        """Get ALL primary members of a flat (there can be more than one)."""
        return self.db.query(FlatUser).filter_by(flat_id=flat_id, role="primary").all()

    def get_all_by_flat(self, flat_id: int) -> List[FlatUser]:
        return self.db.query(FlatUser).filter_by(flat_id=flat_id).all()

    def get_by_user(self, user_id: int, society_id: int = None) -> Optional[FlatUser]:
        q = self.db.query(FlatUser).filter_by(user_id=user_id)
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.first()

    def get_all_by_user(self, user_id: int) -> List[FlatUser]:
        return self.db.query(FlatUser).filter_by(user_id=user_id).all()

    def get_approvers_by_flat(self, flat_id: int) -> List[FlatUser]:
        """Get flat users who can approve — only primary members."""
        return self.db.query(FlatUser).filter_by(flat_id=flat_id, role="primary").all()

    def get_active_by_flat(self, flat_id: int) -> List[FlatUser]:
        """Only residents who haven't moved out."""
        return self.db.query(FlatUser).filter_by(flat_id=flat_id).filter(
            FlatUser.move_out_date.is_(None)
        ).all()

    def get_by_society(self, society_id: int) -> List[FlatUser]:
        return self.db.query(FlatUser).filter_by(society_id=society_id).all()


# ── Guard Repository ───────────────────────────────────────────────────────

class GuardRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(Guard, db)

    def get_all_by_society(self, society_id: int = None) -> List[Guard]:
        q = self.db.query(Guard)
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.all()

    def get_by_user(self, user_id: int, society_id: int = None) -> Optional[Guard]:
        q = self.db.query(Guard).filter_by(user_id=user_id)
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.first()

    def get_by_employee_id(self, employee_id: str, society_id: int = None) -> Optional[Guard]:
        q = self.db.query(Guard).filter_by(employee_id=employee_id)
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.first()

    def employee_id_exists(self, employee_id: str, society_id: int = None, exclude_id: int = None) -> bool:
        q = self.db.query(Guard).filter_by(employee_id=employee_id)
        if society_id:
            q = q.filter_by(society_id=society_id)
        if exclude_id:
            q = q.filter(Guard.id != exclude_id)
        return q.first() is not None


# ── Gate Repository ────────────────────────────────────────────────────────

class GateRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(Gate, db)

    def get_all_by_society(self, society_id: int = None) -> List[Gate]:
        q = self.db.query(Gate)
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.order_by(Gate.name).all()

    def get_active(self, society_id: int = None) -> List[Gate]:
        q = self.db.query(Gate).filter_by(status="active")
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.all()

    def get_entry_gates(self, society_id: int = None) -> List[Gate]:
        q = self.db.query(Gate).filter(
            Gate.status == "active",
            Gate.type.in_(["entry_only", "both"])
        )
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.all()

    def get_exit_gates(self, society_id: int = None) -> List[Gate]:
        q = self.db.query(Gate).filter(
            Gate.status == "active",
            Gate.type.in_(["exit_only", "both"])
        )
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.all()


# ── Gate Session Repository ────────────────────────────────────────────────

class GateSessionRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(GateSession, db)

    def get_active_by_guard(self, guard_id: int) -> Optional[GateSession]:
        """Get the currently open shift for a guard."""
        return self.db.query(GateSession).filter_by(
            guard_id=guard_id,
            shift_end=None
        ).first()

    def get_active_by_gate(self, gate_id: int) -> List[GateSession]:
        """Get all currently active sessions at a gate."""
        return self.db.query(GateSession).filter_by(
            gate_id=gate_id,
            shift_end=None
        ).all()

    def get_all_active(self, society_id: int = None) -> List[GateSession]:
        q = self.db.query(GateSession).filter_by(shift_end=None)
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.all()

    def get_by_guard(self, guard_id: int) -> List[GateSession]:
        return self.db.query(GateSession).filter_by(guard_id=guard_id).order_by(
            GateSession.shift_start.desc()
        ).all()


# ── Visitor Repository ─────────────────────────────────────────────────────

class VisitorRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(Visitor, db)

    def get_by_phone(self, phone: str, society_id: int = None) -> Optional[Visitor]:
        q = self.db.query(Visitor).filter_by(phone=phone)
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.first()

    def search(self, query: str, society_id: int = None) -> List[Visitor]:
        """Search by name or phone."""
        q = self.db.query(Visitor).filter(
            (Visitor.name.ilike(f"%{query}%")) |
            (Visitor.phone.ilike(f"%{query}%"))
        )
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.all()

    def get_blacklisted(self, society_id: int = None) -> List[Visitor]:
        q = self.db.query(Visitor).filter_by(is_blacklisted=True)
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.all()

    def is_blacklisted(self, phone: str, society_id: int = None) -> bool:
        v = self.get_by_phone(phone, society_id=society_id)
        return v.is_blacklisted if v else False


# ── Visitor Log Repository ─────────────────────────────────────────────────

class VisitorLogRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(VisitorLog, db)

    def _base_query(self):
        # ⚡ Bolt Optimization: Eager load relationships used in to_dict() to prevent N+1 queries.
        # VisitorLog.to_dict() accesses visitor, flat, flat_user, entry_gate, and approved_by_flat_user
        return self.db.query(VisitorLog).options(
            joinedload(VisitorLog.visitor),
            joinedload(VisitorLog.flat),
            joinedload(VisitorLog.flat_user),
            joinedload(VisitorLog.entry_gate),
            joinedload(VisitorLog.approved_by_flat_user).joinedload(FlatUser.user)
        )

    def get_pending_for_flat(self, flat_id: int) -> List[VisitorLog]:
        return self._base_query().filter_by(
            flat_id=flat_id,
            approval_status="pending"
        ).order_by(VisitorLog.created_at.desc()).all()

    def get_inside(self, society_id: int = None) -> List[VisitorLog]:
        """Everyone currently inside the society."""
        q = self._base_query().filter_by(status="inside")
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.all()

    def get_inside_for_gate(self, gate_id: int) -> List[VisitorLog]:
        """Visitors expected to exit from a specific gate."""
        return self._base_query().filter_by(
            status="inside",
            expected_exit_gate_id=gate_id
        ).all()

    def get_overdue(self, society_id: int = None) -> List[VisitorLog]:
        """Visitors whose expected exit time has passed."""
        q = self._base_query().filter(
            VisitorLog.status == "inside",
            VisitorLog.expected_exit_by < datetime.utcnow()
        )
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.all()

    def get_by_flat(self, flat_id: int, page: int = 1, per_page: int = 20):
        q = self._base_query().filter_by(flat_id=flat_id).order_by(
            VisitorLog.created_at.desc()
        )
        return self.paginate(page=page, per_page=per_page, query=q)

    def get_today_for_society(self, society_id: int) -> List[VisitorLog]:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        return self._base_query().filter(
            VisitorLog.society_id == society_id,
            (VisitorLog.created_at >= today_start) | (VisitorLog.actual_exit_at >= today_start) | (VisitorLog.entered_at >= today_start)
        ).order_by(VisitorLog.created_at.desc()).all()

    def get_all_filtered(self, filters: dict, page: int = 1, per_page: int = 20, society_id: int = None):
        q = self._base_query()
        target_society_id = society_id or filters.get("society_id")
        if target_society_id:
            q = q.filter_by(society_id=target_society_id)
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

    def get_active_by_flat_user(self, flat_user_id: int) -> List[PreApproval]:
        return self.db.query(PreApproval).filter_by(
            flat_user_id=flat_user_id, status="active"
        ).all()

    def find_valid(self, phone: str, flat_id: int, society_id: int = None) -> Optional[PreApproval]:
        """Check if visitor has a valid pre-approval for this flat right now."""
        now = datetime.utcnow()
        q = self.db.query(PreApproval).join(FlatUser).filter(
            PreApproval.visitor_phone == phone,
            FlatUser.flat_id == flat_id,
            PreApproval.status == "active",
            PreApproval.valid_from <= now,
            PreApproval.valid_until >= now,
        )
        if society_id:
            q = q.filter(PreApproval.society_id == society_id)
        return q.first()


# ── Frequent Pass Repository ───────────────────────────────────────────────

class FrequentPassRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(FrequentPass, db)

    def get_active_by_flat_user(self, flat_user_id: int) -> List[FrequentPass]:
        return self.db.query(FrequentPass).filter_by(
            flat_user_id=flat_user_id, status="active"
        ).all()

    def find_valid(self, visitor_id: int, flat_id: int, society_id: int = None) -> Optional[FrequentPass]:
        """Check if a frequent pass is valid right now for this visitor and flat."""
        from datetime import date
        today      = date.today()
        now_time   = datetime.utcnow().time()
        day_name   = today.strftime("%a").lower()  # "mon", "tue" etc.

        q = self.db.query(FrequentPass).join(FlatUser).filter(
            FrequentPass.visitor_id == visitor_id,
            FlatUser.flat_id == flat_id,
            FrequentPass.status == "active",
            FrequentPass.valid_from <= today,
            (FrequentPass.valid_until >= today) | (FrequentPass.valid_until.is_(None)),
            FrequentPass.allowed_from <= now_time,
            FrequentPass.allowed_until >= now_time,
        )
        if society_id:
            q = q.filter(FrequentPass.society_id == society_id)

        passes = q.all()
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

    def get_unread_count(self, user_id: int) -> int:
        return self.db.query(Notification).filter_by(
            user_id=user_id, status="sent"
        ).count()


# ── Panic Alert Repository ─────────────────────────────────────────────────

class PanicAlertRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(PanicAlert, db)

    def get_active(self, society_id: int = None) -> List[PanicAlert]:
        q = self.db.query(PanicAlert).filter_by(status="active")
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.order_by(PanicAlert.created_at.desc()).all()

    def has_active_for_user(self, user_id: int) -> bool:
        return self.db.query(PanicAlert).filter_by(
            triggered_by=user_id, status="active"
        ).first() is not None


# ── Maintenance Bill Repository ────────────────────────────────────────────

class MaintenanceBillRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(MaintenanceBill, db)

    def get_by_flat(self, flat_id: int) -> List[MaintenanceBill]:
        return self.db.query(MaintenanceBill).filter_by(flat_id=flat_id).order_by(
            MaintenanceBill.generated_at.desc()
        ).all()

    def get_by_society(self, society_id: int = None) -> List[MaintenanceBill]:
        q = self.db.query(MaintenanceBill)
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.order_by(MaintenanceBill.generated_at.desc()).all()

    def get_overdue(self, society_id: int = None) -> List[MaintenanceBill]:
        q = self.db.query(MaintenanceBill).filter_by(status="overdue")
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.all()

    def get_unpaid_for_flat(self, flat_id: int) -> List[MaintenanceBill]:
        return self.db.query(MaintenanceBill).filter(
            MaintenanceBill.flat_id == flat_id,
            MaintenanceBill.status.in_(["unpaid", "overdue"])
        ).all()

    def period_exists(self, flat_id: int, bill_period: str, society_id: int = None) -> bool:
        q = self.db.query(MaintenanceBill).filter_by(flat_id=flat_id, bill_period=bill_period)
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.first() is not None


# ── Maintenance Payment Repository ─────────────────────────────────────────

class MaintenancePaymentRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(MaintenancePayment, db)

    def get_by_society(self, society_id: int = None, status: str = None) -> List[MaintenancePayment]:
        q = self.db.query(MaintenancePayment)
        if society_id:
            q = q.filter_by(society_id=society_id)
        if status:
            q = q.filter_by(status=status)
        return q.order_by(MaintenancePayment.created_at.desc()).all()

    def get_by_flat(self, flat_id: int) -> List[MaintenancePayment]:
        return self.db.query(MaintenancePayment).filter_by(flat_id=flat_id).order_by(
            MaintenancePayment.created_at.desc()
        ).all()


# ── Announcement Repository ────────────────────────────────────────────────

class AnnouncementRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(Announcement, db)

    def get_active(self, society_id: int = None, page: int = 1, per_page: int = 20):
        """Active = not expired."""
        now = datetime.utcnow()
        q = self.db.query(Announcement).filter(
            (Announcement.expires_at.is_(None)) |
            (Announcement.expires_at > now)
        )
        if society_id:
            q = q.filter_by(society_id=society_id)
        q = q.order_by(
            Announcement.priority.desc(),
            Announcement.created_at.desc()
        )
        return self.paginate(page=page, per_page=per_page, query=q)

    def get_urgent(self, society_id: int = None) -> List[Announcement]:
        now = datetime.utcnow()
        q = self.db.query(Announcement).filter(
            Announcement.priority == "urgent",
            (Announcement.expires_at.is_(None)) | (Announcement.expires_at > now)
        )
        if society_id:
            q = q.filter_by(society_id=society_id)
        return q.all()


# ── Visitor Rating Repository ──────────────────────────────────────────────

class VisitorRatingRepository(BaseRepository):
    def __init__(self, db):
        self.db = db
        super().__init__(VisitorRating, db)

    def get_by_visitor(self, visitor_id: int) -> List[VisitorRating]:
        return self.db.query(VisitorRating).join(VisitorLog).filter(
            VisitorLog.visitor_id == visitor_id
        ).all()

    def already_rated(self, visitor_log_id: int, user_id: int) -> bool:
        return self.db.query(VisitorRating).filter_by(
            visitor_log_id=visitor_log_id,
            rated_by=user_id
        ).first() is not None

    def get_average_rating(self, visitor_id: int) -> Optional[float]:
        result = self.db.query(VisitorRating).join(VisitorLog).filter(
            VisitorLog.visitor_id == visitor_id
        ).with_entities(func.avg(VisitorRating.rating)).scalar()
        return round(float(result), 1) if result else None
