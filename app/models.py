from .extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class Flat(db.Model):
    __tablename__ = "flats"
    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.String(20), unique=True, nullable=False)
    owner_name = db.Column(db.String(100), nullable=False)

class Resident(db.Model):
    __tablename__ = "residents"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    mobile = db.Column(db.String(15), nullable=False, unique=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    flat_id = db.Column(db.Integer, db.ForeignKey("flats.id"), nullable=False)
    flat = db.relationship("Flat", backref="residents")
    is_primary = db.Column(db.Boolean, default=False)

    # 🔑 NEW FIELD
    is_approved = db.Column(db.Boolean, default=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)



class Guard(db.Model):
    __tablename__ = "guards"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    mobile = db.Column(db.String(15), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Visitor(db.Model):
    __tablename__ = "visitors"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    mobile = db.Column(db.String(15), nullable=False)
    company = db.Column(db.String(100))
    last_visited = db.Column(db.DateTime)

class Visit(db.Model):
    __tablename__ = "visits"
    id = db.Column(db.Integer, primary_key=True)
    visitor_id = db.Column(db.Integer, db.ForeignKey("visitors.id"), nullable=False)
    flat_id = db.Column(db.Integer, db.ForeignKey("flats.id"), nullable=False)
    purpose = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), default="PENDING")  # PENDING, APPROVED, REJECTED, COMPLETED
    in_time = db.Column(db.DateTime, default=datetime.utcnow)
    out_time = db.Column(db.DateTime)

    visitor = db.relationship("Visitor", backref="visits")
    flat = db.relationship("Flat", backref="visits")

class Admin(db.Model):
    __tablename__ = "admins"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    mobile = db.Column(db.String(15), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Announcement(db.Model):
    __tablename__ = "announcements"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)

    type = db.Column(db.String(50), nullable=False)
    # example: INFO, ALERT, MAINTENANCE

    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class GateStatus(db.Model):
    __tablename__ = "gate_status"

    id = db.Column(db.Integer, primary_key=True)
    gate_name = db.Column(db.String(50), default="BACK_GATE", unique=True)
    status = db.Column(db.String(20), nullable=False)
    # OPEN / CLOSED

    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_by = db.Column(db.String(20))
    # guard name or id
