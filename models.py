from app import db

class Flats(db.Model):
    fsno= db.Column(db.Integer, primary_key=True)
    fnum = db.Column(db.Integer, nullable=False)
    fowner = db.Column(db.String(100), nullable=False)



class VReg(db.Model):
    __tablename__ = 'v_reg'
    vsno = db.Column(db.Integer, primary_key=True)
    vfnum = db.Column(db.Integer, nullable=False)
    vfowner = db.Column(db.String(100), nullable=False)
    vname = db.Column(db.String(100), nullable=False)
    vwork= db.Column(db.String(100), nullable=False)
    v_in = db.Column(db.String(100),nullable=False)
    v_out = db.Column(db.String(100),nullable=False)


class guard(db.Model):
    __tablename__ = 'guard'
    gsn = db.Column(db.Integer, primary_key=True)
    guname = db.Column(db.String(100), nullable=False)
    gpassword = db.Column(db.String(100),nullable=False)
    gmobile=db.Column(db.String(13),nullable=False)