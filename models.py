from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class Flats(db.Model):
    __tablename__ = 'flats'
    id= db.Column(db.Integer, primary_key=True,autoincrement=True)
    fnum = db.Column(db.Integer, nullable=False)
    fowner = db.Column(db.String(100), nullable=False)

class Guard(db.Model):
    __tablename__ = 'guard'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    guname = db.Column(db.String(100), nullable=False)
    gpassword = db.Column(db.String(100),nullable=False)
    gmobile=db.Column(db.String(13),nullable=False)

class Visitors(db.Model):
    __tablename__ = 'visitors'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    flat_id = db.Column(db.Integer, db.ForeignKey('flats.id'), nullable=False)
    flat = db.relationship(Flats, backref='visitors', lazy=True)
    vfowner = db.Column(db.String(100), nullable=True)
    vname = db.Column(db.String(100), nullable=False)
    vwork= db.Column(db.String(100), nullable=False)
    v_in = db.Column(db.String(100))
    v_out = db.Column(db.String(100))
    guard_id = db.Column(db.Integer, db.ForeignKey('guard.id'), nullable=False)
    guard = db.relationship(Guard, backref='visitors', lazy=True)

class Residents(db.Model):
    __tablename__ = "residents"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    mobile = db.Column(db.String(15), nullable=False, unique=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_primary = db.Column(db.Boolean, default=False)

    flat_id = db.Column(db.Integer, db.ForeignKey("flats.id"), nullable=False)
    flat = db.relationship(Flats, backref=db.backref("residents", lazy=True))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)