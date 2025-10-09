from flask import Flask, render_template,request
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_migrate import Migrate

app = Flask(__name__)

# Use one database (you can combine both tables in one)
app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///mydb4.db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

migrate = Migrate(app, db)
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




@app.route('/')
def hello():
    return render_template('home.html')

@app.route('/ventry')
def ventry():
    all_record = VReg.query.all()
    return render_template('visiterreg.html', vallrecord=all_record)


@app.route('/home')
def home():
    return render_template('glogin.html')

@app.route('/gourdl')
def gourd_l():
    return render_template('glogin.html')

@app.route('/vlogin')
def visiter_l():
    return render_template('visitercheck.html')

@app.route('/flatlogin')
def flat_l():
    return render_template('flatentry.html')

@app.route('/adminlogin')
def admin_l():
    return render_template('admin.html')

@app.route('/visiter', methods=['GET','POST'])
def visiter():
    if request.method=='POST':

        vfn = request.form['vfnum']
        vfo = request.form['vfowner']
        vn = request.form['vname']
        vw = request.form['vwork']
        vi = request.form['vintt']
        vo = request.form['voutt']

        vrecord=VReg(vfnum=vfn,vfowner=vfo,vname=vn,vwork=vw,v_in=vi,v_out=vo)
        db.session.add(vrecord)
        db.session.commit()
    vallrecord=VReg.query.all()
    return render_template('visiter.html',vallrecord=vallrecord)

@app.route('/flatentry', methods=['GET','POST'])
def flatentry():
    action = request.form.get('action')

    if request.method=='POST':

        fn = request.form['fnum']
        fo = request.form['fowner']

        if action=="add" :
            record=Flats(fnum=fn,fowner=fo)
            db.session.add(record)
            db.session.commit()
            print("Flat added successfully!")

        if action=="delete":
            record = Flats.query.filter_by(fnum=fn).first()
            if record:
                db.session.delete(record)
                db.session.commit()
                print("Flat deleted successfully!")
            else:
                print("Flat not found!")
        if action=="update":
            record = Flats.query.filter_by(fnum=fn).first()
            if record:
                record.fowner = fo
                db.session.commit()
                print("Flat updated successfully!")
            else:
                print("Flat not found!")
    allrecord = Flats.query.order_by(Flats.fnum).all()
    allrecord = Flats.query.order_by(Flats.fnum).all()

    seen = set()
    unique_flats = []

    for f in allrecord:
        key = (f.fnum, f.fowner)
        if key not in seen:
            seen.add(key)
            unique_flats.append({'fsno': f.fsno, 'fnum': f.fnum, 'fowner': f.fowner})
    return render_template('flatentry.html',allrecord=unique_flats)

@app.route('/flat', methods=['GET','POST'])
def flat():
    if request.method=='POST':

        fn = request.form['fnum']
        fo = request.form['fowner']

        record=Flats(fnum=fn,fowner=fo)
        db.session.add(record)
        db.session.commit()
    allrecord=Flats.query.all()
    return render_template('flat.html',allrecord=allrecord)

@app.route('/check',methods=['GET','POST'])
def check():
    if request.method=='POST':
        fn=request.form['vfn']
        vn=request.form['vn']
        vw=request.form['vw']


        flat = Flats.query.filter_by(fnum=fn).first()
        if flat:

            return render_template('flat.html', flat=flat,vn=vn,vw=vw)
        else:
            return "Flat number not found"
    return "Please submit the form"


@app.route('/admincheck', methods=['GET', 'POST'])
def acheck():
    if request.method == 'POST':
        auname = request.form['aun']
        apassword = request.form['ap']

        if auname == "neetu" and apassword == "123":
            return render_template('adminpage.html')
        else:
            return "Admin not found"
    return "plese submit the form"

@app.route('/guardentry', methods=['GET', 'POST'])
def guardentry():
    if request.method == 'POST':
        action = request.form.get('action')
        gsn = request.form.get('gsn')
        gun = request.form.get('guname')
        gpw = request.form.get('gpw')
        gm  = request.form.get('gm')


        if action == "add":
            new_guard = guard(gsn=gsn, guname=gun, gpassword=gpw, gmobile=gm)
            db.session.add(new_guard)
            db.session.commit()
            print("Guard added successfully!")

        elif action == "delete":
            record = guard.query.get(gsn)
            if record:
                db.session.delete(record)
                db.session.commit()
            else:
                print("Guard not found!")

        elif action == "update":
            record = guard.query.get(gsn)
            if record:
                record.guname = gun
                record.gpassword = gpw
                record.gmobile = gm
                db.session.commit()
            else:
                print("Guard not found!")

    allrecord = guard.query.all()
    return render_template('guardentry.html', allrecord=allrecord)

@app.route('/result',methods=['GET','POST'])
def result():
    a=request.form['ans']
    b=request.form['fn']
    c=request.form['fo']
    d=request.form['vn']
    e=request.form['vw']


    if a=="yes":

        return render_template('visiter.html',a=a,vfnun=b,vfowner=c,vname=d,vwork=e)
    else:
        return "Permission denied or invalid answer"


@app.route('/glogin', methods=['GET', 'POST'])
def glogin():
    if request.method == 'POST':
        a = request.form['guname']
        b = request.form['gpw']

        if not a or not b:
            return "Please enter both username and password"

        x = guard.query.filter_by(guname=a).first()

        if x and x.gpassword == b:
            return render_template('visitercheckhtml')
        else:
            return "Permission denied or invalid answer"


    return render_template('glogin.html')

from flask import jsonify
@app.route('/api/flats')
def get_flats():
    flats = Flats.query.order_by(Flats.fnum).all()


    seen = set()
    unique_flats = []

    for f in flats:
        if f.fnum not in seen:
            seen.add(f.fnum)
            unique_flats.append({'fsno': f.fsno, 'fnum': f.fnum})

    return jsonify(unique_flats)


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)

