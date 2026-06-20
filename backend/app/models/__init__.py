"""
Database models for RM2 VMS.
All 15 tables defined using SQLAlchemy ORM.
Each model has a to_dict() method for clean serialisation.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean, Date, Time, Text, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.database import Base


# ── 1. Gates ───────────────────────────────────────────────────────────────

class Gate(Base):
    __tablename__ = "gates"

    id         = Column(Integer, primary_key=True)
    name       = Column(String(100), nullable=False)
    type       = Column(Enum("entry_only", "exit_only", "both", name="gate_type"), nullable=False)
    status     = Column(Enum("active", "inactive", name="gate_status"), default="active", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    gate_sessions  = relationship("GateSession",  back_populates="gate", lazy="dynamic")
    visitor_logs   = relationship("VisitorLog",   foreign_keys="VisitorLog.entry_gate_id", back_populates="entry_gate", lazy="dynamic")
    panic_alerts   = relationship("PanicAlert",   back_populates="gate", lazy="dynamic")

    def to_dict(self):
        return {
            "id":         self.id,
            "name":       self.name,
            "type":       self.type,
            "status":     self.status,
            "created_at": self.created_at.isoformat(),
        }


# ── 2. Flats ───────────────────────────────────────────────────────────────

class Flat(Base):
    __tablename__ = "flats"

    id          = Column(Integer, primary_key=True)
    flat_number = Column(String(20), nullable=False, unique=True)
    status      = Column(Enum("occupied", "vacant", name="flat_status"), default="vacant", nullable=False)
    maintenance_valid_until = Column(Date, nullable=True)

    # Relationships
    flat_users         = relationship("FlatUser",         back_populates="flat",  lazy="dynamic")
    visitor_logs       = relationship("VisitorLog",       back_populates="flat",  lazy="dynamic")
    maintenance_bills  = relationship("MaintenanceBill",  back_populates="flat",  lazy="dynamic")
    maintenance_payments = relationship("MaintenancePayment", back_populates="flat", lazy="dynamic")
    panic_alerts       = relationship("PanicAlert",       back_populates="flat",  lazy="dynamic")

    def to_dict(self):
        return {
            "id":          self.id,
            "flat_number": self.flat_number,
            "status":      self.status,
            "maintenance_valid_until": self.maintenance_valid_until.isoformat() if self.maintenance_valid_until else None,
        }


# ── 3. Users ───────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True)
    name          = Column(String(150), nullable=False)
    phone         = Column(String(20), unique=True, nullable=False)
    email         = Column(String(150), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(Enum("resident", "guard", "admin", name="user_role"), nullable=False)
    status        = Column(Enum("active", "inactive", "pending_verification", name="user_status"), default="pending_verification", nullable=False)
    requested_flat_id = Column(Integer, ForeignKey("flats.id"), nullable=True)
    expo_push_token = Column(String(255), nullable=True)
    move_in_date  = Column(Date, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login    = Column(DateTime, nullable=True)

    # Relationships
    flat_user            = relationship("FlatUser",           back_populates="user",    uselist=False)
    guard                = relationship("Guard",              back_populates="user",    uselist=False)
    requested_flat       = relationship("Flat",               foreign_keys=[requested_flat_id])
    visitor_ratings      = relationship("VisitorRating",      back_populates="rated_by_user", lazy="dynamic")
    notifications        = relationship("Notification",       back_populates="user",    lazy="dynamic")
    panic_alerts_triggered = relationship("PanicAlert",       foreign_keys="PanicAlert.triggered_by", back_populates="triggered_by_user", lazy="dynamic")
    panic_alerts_resolved  = relationship("PanicAlert",       foreign_keys="PanicAlert.resolved_by",  back_populates="resolved_by_user",  lazy="dynamic")
    maintenance_payments = relationship("MaintenanceBill",    foreign_keys="MaintenanceBill.paid_by", back_populates="paid_by_user", lazy="dynamic")
    announcements        = relationship("Announcement",       back_populates="created_by_user", lazy="dynamic")

    def to_dict(self, include_sensitive=False):
        data = {
            "id":         self.id,
            "name":       self.name,
            "phone":      self.phone,
            "email":      self.email,
            "role":       self.role,
            "status":     self.status,
            "requested_flat_id": self.requested_flat_id,
            "requested_flat": self.requested_flat.to_dict() if self.requested_flat else None,
            "move_in_date": self.move_in_date.isoformat() if self.move_in_date else None,
            "created_at": self.created_at.isoformat(),
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }
        return data


# ── 4. Flat Users (residents + family members) ─────────────────────────────

class FlatUser(Base):
    __tablename__ = "flat_users"

    id            = Column(Integer, primary_key=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    flat_id       = Column(Integer, ForeignKey("flats.id"), nullable=False)
    role          = Column(Enum("primary", "spouse", "parent", "child", "sibling", name="flat_user_role"), nullable=False)
    is_owner      = Column(Boolean, default=False, nullable=False)
    can_approve   = Column(Boolean, default=True, nullable=False)
    move_in_date  = Column(Date, nullable=False)
    move_out_date = Column(Date, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user           = relationship("User",           back_populates="flat_user")
    flat           = relationship("Flat",           back_populates="flat_users")
    visitor_logs   = relationship("VisitorLog",     foreign_keys="VisitorLog.flat_user_id", back_populates="flat_user", lazy="dynamic")
    approved_logs  = relationship("VisitorLog",     foreign_keys="VisitorLog.approved_by",  back_populates="approved_by_flat_user", lazy="dynamic")
    pre_approvals  = relationship("PreApproval",    back_populates="flat_user", lazy="dynamic")
    frequent_passes = relationship("FrequentPass",  back_populates="flat_user", lazy="dynamic")

    def to_dict(self):
        return {
            "id":            self.id,
            "user_id":       self.user_id,
            "flat_id":       self.flat_id,
            "role":          self.role,
            "is_owner":      self.is_owner,
            "can_approve":   self.can_approve,
            "move_in_date":  self.move_in_date.isoformat() if self.move_in_date else None,
            "move_out_date": self.move_out_date.isoformat() if self.move_out_date else None,
            "created_at":    self.created_at.isoformat(),
            "user":          self.user.to_dict() if self.user else None,
            "flat":          self.flat.to_dict() if self.flat else None,
        }


# ── 5. Guards ─────────────────────────────────────────────────────────────

class Guard(Base):
    __tablename__ = "guards"

    id          = Column(Integer, primary_key=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    employee_id = Column(String(50), unique=True, nullable=False)
    shift       = Column(Enum("morning", "night", name="guard_shift"), nullable=False)

    # Relationships
    user          = relationship("User",         back_populates="guard")
    gate_sessions = relationship("GateSession",  back_populates="guard", lazy="dynamic")
    visitor_logs  = relationship("VisitorLog",   back_populates="registered_by_guard_rel", lazy="dynamic")

    def to_dict(self):
        return {
            "id":          self.id,
            "user_id":     self.user_id,
            "employee_id": self.employee_id,
            "shift":       self.shift,
            "user":        self.user.to_dict() if self.user else None,
        }


# ── 6. Visitors ───────────────────────────────────────────────────────────

class Visitor(Base):
    __tablename__ = "visitors"

    id               = Column(Integer, primary_key=True)
    name             = Column(String(150), nullable=False)
    phone            = Column(String(20), nullable=False)
    photo_url        = Column(String(500), nullable=True)
    id_proof_url     = Column(String(500), nullable=True)
    is_blacklisted   = Column(Boolean, default=False, nullable=False)
    blacklist_reason = Column(Text, nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    visitor_logs    = relationship("VisitorLog",    back_populates="visitor", lazy="dynamic")
    frequent_passes = relationship("FrequentPass",  back_populates="visitor", lazy="dynamic")
    ratings         = relationship("VisitorRating", secondary="visitor_logs",
                                       primaryjoin="Visitor.id==VisitorLog.visitor_id",
                                       secondaryjoin="VisitorLog.id==VisitorRating.visitor_log_id",
                                       viewonly=True, lazy="dynamic")

    def to_dict(self):
        return {
            "id":               self.id,
            "name":             self.name,
            "phone":            self.phone,
            "photo_url":        self.photo_url,
            "id_proof_url":     self.id_proof_url,
            "is_blacklisted":   self.is_blacklisted,
            "blacklist_reason": self.blacklist_reason,
            "created_at":       self.created_at.isoformat(),
        }


# ── 7. Visitor Logs ───────────────────────────────────────────────────────

class VisitorLog(Base):
    __tablename__ = "visitor_logs"

    id                    = Column(Integer, primary_key=True)
    visitor_id            = Column(Integer, ForeignKey("visitors.id"),   nullable=False)
    flat_id               = Column(Integer, ForeignKey("flats.id"),      nullable=False)
    flat_user_id          = Column(Integer, ForeignKey("flat_users.id"), nullable=False)

    # Entry
    entry_gate_id         = Column(Integer, ForeignKey("gates.id"),   nullable=False)
    entry_mode            = Column(Enum("foot", "two_wheeler", "four_wheeler", name="entry_mode"), nullable=False)
    vehicle_number        = Column(String(20), nullable=True)
    entered_at            = Column(DateTime, nullable=True)
    registered_by_guard   = Column(Integer, ForeignKey("guards.id"), nullable=True)

    # Approval
    approval_source       = Column(Enum("guard_initiated", "self_checkin", name="approval_source"), nullable=False)
    approval_status       = Column(Enum("pending", "approved", "denied", name="approval_status"), default="pending", nullable=False)
    approved_by           = Column(Integer, ForeignKey("flat_users.id"), nullable=True)
    approved_at           = Column(DateTime, nullable=True)

    # Duration
    purpose               = Column(String(100), nullable=False)
    stay_duration         = Column(Enum("30min", "1_2hr", "half_day", "full_day", "overnight", name="stay_duration"), nullable=False)
    expected_exit_by      = Column(DateTime, nullable=True)
    expected_exit_gate_id = Column(Integer, ForeignKey("gates.id"), nullable=True)

    # Exit
    actual_exit_gate_id   = Column(Integer, ForeignKey("gates.id"), nullable=True)
    actual_exit_at        = Column(DateTime, nullable=True)
    exit_confirmed_by     = Column(Enum("guard", "resident", "system", name="exit_confirmed_by"), nullable=True)

    # Status
    status                = Column(
        Enum("pending", "approved", "denied", "inside", "overdue", "exited", "unconfirmed_exit", "cancelled", name="visitor_log_status"),
        default="pending", nullable=False
    )
    notes                 = Column(Text, nullable=True)
    created_at            = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    visitor                    = relationship("Visitor",   back_populates="visitor_logs")
    flat                       = relationship("Flat",      back_populates="visitor_logs")
    flat_user                  = relationship("FlatUser",  foreign_keys=[flat_user_id], back_populates="visitor_logs")
    approved_by_flat_user      = relationship("FlatUser",  foreign_keys=[approved_by],  back_populates="approved_logs")
    entry_gate                 = relationship("Gate",      foreign_keys=[entry_gate_id], back_populates="visitor_logs")
    expected_exit_gate         = relationship("Gate",      foreign_keys=[expected_exit_gate_id])
    actual_exit_gate           = relationship("Gate",      foreign_keys=[actual_exit_gate_id])
    registered_by_guard_rel    = relationship("Guard",     back_populates="visitor_logs")
    ratings                    = relationship("VisitorRating", back_populates="visitor_log", lazy="dynamic")
    notifications              = relationship("Notification",  back_populates="visitor_log", lazy="dynamic")

    def to_dict(self):
        return {
            "id":                    self.id,
            "visitor_id":            self.visitor_id,
            "flat_id":               self.flat_id,
            "flat_user_id":          self.flat_user_id,
            "entry_gate_id":         self.entry_gate_id,
            "entry_mode":            self.entry_mode,
            "vehicle_number":        self.vehicle_number,
            "entered_at":            self.entered_at.isoformat() if self.entered_at else None,
            "registered_by_guard":   self.registered_by_guard,
            "approval_source":       self.approval_source,
            "approval_status":       self.approval_status,
            "approved_by":           self.approved_by,
            "approved_at":           self.approved_at.isoformat() if self.approved_at else None,
            "purpose":               self.purpose,
            "stay_duration":         self.stay_duration,
            "expected_exit_by":      self.expected_exit_by.isoformat() if self.expected_exit_by else None,
            "expected_exit_gate_id": self.expected_exit_gate_id,
            "actual_exit_gate_id":   self.actual_exit_gate_id,
            "actual_exit_at":        self.actual_exit_at.isoformat() if self.actual_exit_at else None,
            "exit_confirmed_by":     self.exit_confirmed_by,
            "status":                self.status,
            "notes":                 self.notes,
            "created_at":            self.created_at.isoformat(),
            "visitor":               self.visitor.to_dict() if self.visitor else None,
            "flat":                  self.flat.to_dict() if self.flat else None,
        }


# ── 8. Pre Approvals ──────────────────────────────────────────────────────

class PreApproval(Base):
    __tablename__ = "pre_approvals"

    id              = Column(Integer, primary_key=True)
    flat_user_id    = Column(Integer, ForeignKey("flat_users.id"), nullable=False)
    visitor_name    = Column(String(150), nullable=False)
    visitor_phone   = Column(String(20), nullable=False)
    valid_from      = Column(DateTime, nullable=False)
    valid_until     = Column(DateTime, nullable=False)
    purpose         = Column(String(200), nullable=True)
    is_recurring    = Column(Boolean, default=False, nullable=False)
    recurrence_rule = Column(String(50), nullable=True)
    used_count      = Column(Integer, default=0, nullable=False)
    status          = Column(Enum("active", "expired", "cancelled", name="pre_approval_status"), default="active", nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    flat_user = relationship("FlatUser", back_populates="pre_approvals")

    def to_dict(self):
        return {
            "id":              self.id,
            "flat_user_id":    self.flat_user_id,
            "visitor_name":    self.visitor_name,
            "visitor_phone":   self.visitor_phone,
            "valid_from":      self.valid_from.isoformat(),
            "valid_until":     self.valid_until.isoformat(),
            "purpose":         self.purpose,
            "is_recurring":    self.is_recurring,
            "recurrence_rule": self.recurrence_rule,
            "used_count":      self.used_count,
            "status":          self.status,
            "created_at":      self.created_at.isoformat(),
        }


# ── 9. Frequent Passes ────────────────────────────────────────────────────

class FrequentPass(Base):
    __tablename__ = "frequent_passes"

    id            = Column(Integer, primary_key=True)
    flat_user_id  = Column(Integer, ForeignKey("flat_users.id"), nullable=False)
    visitor_id    = Column(Integer, ForeignKey("visitors.id"),   nullable=False)
    name          = Column(String(150), nullable=False)
    valid_from    = Column(Date, nullable=False)
    valid_until   = Column(Date, nullable=True)
    allowed_days  = Column(String(50), nullable=False)
    allowed_from  = Column(Time, nullable=False)
    allowed_until = Column(Time, nullable=False)
    status        = Column(Enum("active", "suspended", "expired", name="frequent_pass_status"), default="active", nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    flat_user = relationship("FlatUser", back_populates="frequent_passes")
    visitor   = relationship("Visitor",  back_populates="frequent_passes")

    def to_dict(self):
        return {
            "id":            self.id,
            "flat_user_id":  self.flat_user_id,
            "visitor_id":    self.visitor_id,
            "name":          self.name,
            "valid_from":    self.valid_from.isoformat() if self.valid_from else None,
            "valid_until":   self.valid_until.isoformat() if self.valid_until else None,
            "allowed_days":  self.allowed_days,
            "allowed_from":  str(self.allowed_from) if self.allowed_from else None,
            "allowed_until": str(self.allowed_until) if self.allowed_until else None,
            "status":        self.status,
            "created_at":    self.created_at.isoformat(),
            "visitor":       self.visitor.to_dict() if self.visitor else None,
        }


# ── 10. Visitor Ratings ───────────────────────────────────────────────────

class VisitorRating(Base):
    __tablename__ = "visitor_ratings"

    id              = Column(Integer, primary_key=True)
    visitor_log_id  = Column(Integer, ForeignKey("visitor_logs.id"), nullable=False)
    rated_by        = Column(Integer, ForeignKey("users.id"),        nullable=False)
    rating          = Column(Integer, nullable=False)
    comment         = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    visitor_log   = relationship("VisitorLog", back_populates="ratings")
    rated_by_user = relationship("User",       back_populates="visitor_ratings")

    def to_dict(self):
        return {
            "id":             self.id,
            "visitor_log_id": self.visitor_log_id,
            "rated_by":       self.rated_by,
            "rating":         self.rating,
            "comment":        self.comment,
            "created_at":     self.created_at.isoformat(),
        }


# ── 11. Notifications ─────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id              = Column(Integer, primary_key=True)
    user_id         = Column(Integer, ForeignKey("users.id"),        nullable=False)
    visitor_log_id  = Column(Integer, ForeignKey("visitor_logs.id"), nullable=True)
    type            = Column(Enum(
        "approval_request", "overdue_alert", "entry_confirmed",
        "exit_confirmed", "pre_approval_used", "departure_confirmation",
        "panic_alert", "announcement", "bill_due",
        name="notification_type"
    ), nullable=False)
    channel         = Column(Enum("push", "sms", "in_app", name="notification_channel"), nullable=False)
    message         = Column(Text, nullable=False)
    status          = Column(Enum("sent", "delivered", "failed", name="notification_status"), default="sent", nullable=False)
    sent_at         = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user        = relationship("User",        back_populates="notifications")
    visitor_log = relationship("VisitorLog",  back_populates="notifications")

    def to_dict(self):
        return {
            "id":             self.id,
            "user_id":        self.user_id,
            "visitor_log_id": self.visitor_log_id,
            "type":           self.type,
            "channel":        self.channel,
            "message":        self.message,
            "status":         self.status,
            "sent_at":        self.sent_at.isoformat(),
        }


# ── 12. Gate Sessions ─────────────────────────────────────────────────────

class GateSession(Base):
    __tablename__ = "gate_sessions"

    id          = Column(Integer, primary_key=True)
    guard_id    = Column(Integer, ForeignKey("guards.id"), nullable=False)
    gate_id     = Column(Integer, ForeignKey("gates.id"),  nullable=False)
    shift_start = Column(DateTime, default=datetime.utcnow, nullable=False)
    shift_end   = Column(DateTime, nullable=True)

    # Relationships
    guard = relationship("Guard", back_populates="gate_sessions")
    gate  = relationship("Gate",  back_populates="gate_sessions")

    def to_dict(self):
        return {
            "id":          self.id,
            "guard_id":    self.guard_id,
            "gate_id":     self.gate_id,
            "shift_start": self.shift_start.isoformat(),
            "shift_end":   self.shift_end.isoformat() if self.shift_end else None,
            "guard":       self.guard.to_dict() if self.guard else None,
            "gate":        self.gate.to_dict() if self.gate else None,
        }


# ── 13. Panic Alerts ──────────────────────────────────────────────────────

class PanicAlert(Base):
    __tablename__ = "panic_alerts"

    id           = Column(Integer, primary_key=True)
    triggered_by = Column(Integer, ForeignKey("users.id"),  nullable=False)
    role         = Column(Enum("guard", "resident", name="panic_role"), nullable=False)
    gate_id      = Column(Integer, ForeignKey("gates.id"),  nullable=True)
    flat_id      = Column(Integer, ForeignKey("flats.id"),  nullable=True)
    message      = Column(Text, nullable=True)
    status       = Column(Enum("active", "resolved", name="panic_status"), default="active", nullable=False)
    resolved_by  = Column(Integer, ForeignKey("users.id"),  nullable=True)
    resolved_at  = Column(DateTime, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    triggered_by_user = relationship("User", foreign_keys=[triggered_by], back_populates="panic_alerts_triggered")
    resolved_by_user  = relationship("User", foreign_keys=[resolved_by],  back_populates="panic_alerts_resolved")
    gate              = relationship("Gate", back_populates="panic_alerts")
    flat              = relationship("Flat", back_populates="panic_alerts")

    def to_dict(self):
        return {
            "id":           self.id,
            "triggered_by": self.triggered_by,
            "role":         self.role,
            "gate_id":      self.gate_id,
            "flat_id":      self.flat_id,
            "message":      self.message,
            "status":       self.status,
            "resolved_by":  self.resolved_by,
            "resolved_at":  self.resolved_at.isoformat() if self.resolved_at else None,
            "created_at":   self.created_at.isoformat(),
        }


# ── 14. Maintenance Bills ─────────────────────────────────────────────────

class MaintenanceBill(Base):
    __tablename__ = "maintenance_bills"

    id              = Column(Integer, primary_key=True)
    flat_id         = Column(Integer, ForeignKey("flats.id"), nullable=False)
    bill_period     = Column(String(20), nullable=False)
    schedule        = Column(Enum("monthly", "quarterly", "half_yearly", "yearly", name="bill_schedule"), nullable=False)
    amount          = Column(Numeric(10, 2), nullable=False)
    due_date        = Column(Date, nullable=False)
    status          = Column(Enum("unpaid", "paid", "overdue", name="bill_status"), default="unpaid", nullable=False)
    paid_by         = Column(Integer, ForeignKey("users.id"), nullable=True)
    amount_paid     = Column(Numeric(10, 2), nullable=True)
    payment_mode    = Column(Enum("upi", "card", "cash", "bank_transfer", name="payment_mode"), nullable=True)
    transaction_ref = Column(String(100), nullable=True)
    paid_at         = Column(DateTime, nullable=True)
    receipt_url     = Column(String(500), nullable=True)
    generated_at    = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    flat         = relationship("Flat", back_populates="maintenance_bills")
    paid_by_user = relationship("User", foreign_keys=[paid_by], back_populates="maintenance_payments")

    def to_dict(self):
        return {
            "id":              self.id,
            "flat_id":         self.flat_id,
            "bill_period":     self.bill_period,
            "schedule":        self.schedule,
            "amount":          str(self.amount),
            "due_date":        self.due_date.isoformat() if self.due_date else None,
            "status":          self.status,
            "paid_by":         self.paid_by,
            "amount_paid":     str(self.amount_paid) if self.amount_paid else None,
            "payment_mode":    self.payment_mode,
            "transaction_ref": self.transaction_ref,
            "paid_at":         self.paid_at.isoformat() if self.paid_at else None,
            "receipt_url":     self.receipt_url,
            "generated_at":    self.generated_at.isoformat(),
        }

class MaintenancePayment(Base):
    __tablename__ = "maintenance_payments"

    id              = Column(Integer, primary_key=True)
    flat_id         = Column(Integer, ForeignKey("flats.id"), nullable=False)
    paid_by         = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount          = Column(Numeric(10, 2), nullable=False)
    months_added    = Column(Integer, nullable=False)
    utr_number      = Column(String(100), nullable=False)
    status          = Column(Enum("pending", "approved", "rejected", name="maint_payment_status"), default="pending", nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at    = Column(DateTime, nullable=True)

    # Relationships
    flat         = relationship("Flat", back_populates="maintenance_payments")
    paid_by_user = relationship("User", foreign_keys=[paid_by])

    def to_dict(self):
        return {
            "id":              self.id,
            "flat_id":         self.flat_id,
            "flat_number":     self.flat.flat_number if self.flat else None,
            "paid_by":         self.paid_by,
            "amount":          float(self.amount),
            "months_added":    self.months_added,
            "utr_number":      self.utr_number,
            "status":          self.status,
            "created_at":      self.created_at.isoformat() if self.created_at else None,
            "processed_at":    self.processed_at.isoformat() if self.processed_at else None,
        }


# ── 15. Announcements ─────────────────────────────────────────────────────

class Announcement(Base):
    __tablename__ = "announcements"

    id             = Column(Integer, primary_key=True)
    created_by     = Column(Integer, ForeignKey("users.id"), nullable=False)
    title          = Column(String(255), nullable=False)
    body           = Column(Text, nullable=False)
    priority       = Column(Enum("normal", "urgent", name="announcement_priority"), default="normal", nullable=False)
    attachment_url = Column(String(500), nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at     = Column(DateTime, nullable=True)

    # Relationships
    created_by_user = relationship("User", back_populates="announcements")

    def to_dict(self):
        return {
            "id":             self.id,
            "created_by":     self.created_by,
            "title":          self.title,
            "body":           self.body,
            "priority":       self.priority,
            "attachment_url": self.attachment_url,
            "created_at":     self.created_at.isoformat(),
            "expires_at":     self.expires_at.isoformat() if self.expires_at else None,
        }
