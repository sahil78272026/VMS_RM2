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

    def set_password(self, pw):
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw):
        return check_password_hash(self.password_hash, pw)



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
