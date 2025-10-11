from models import *
from flask import render_template, request, send_file, Blueprint
from datetime import datetime
import io, qrcode


main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def hello():
    return render_template('home.html')

@main_bp.route('/ventry')
def ventry():
    all_record = VReg.query.all()
    return render_template('visiterreg.html', vallrecord=all_record)


@main_bp.route('/home')
def home():
    return render_template('glogin.html')

@main_bp.route('/gourdl')
def gourd_l():
    return render_template('glogin.html')

@main_bp.route('/vlogin')
def visiter_l():
    return render_template('visitercheck.html')

@main_bp.route('/flatlogin')
def flat_l():
    return render_template('flatentry.html')

@main_bp.route('/adminlogin')
def admin_l():
    return render_template('admin.html')

@main_bp.route('/visiter', methods=['GET','POST'])
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

@main_bp.route('/flatentry', methods=['GET','POST'])
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

    seen = set()
    unique_flats = []

    for f in allrecord:
        key = (f.fnum, f.fowner)
        if key not in seen:
            seen.add(key)
            unique_flats.main_bpend({'fsno': f.fsno, 'fnum': f.fnum, 'fowner': f.fowner})
    return render_template('flatentry.html',allrecord=unique_flats)

@main_bp.route('/flat', methods=['GET','POST'])
def flat():
    if request.method=='POST':

        fn = request.form['fnum']
        fo = request.form['fowner']

        record=Flats(fnum=fn,fowner=fo)
        db.session.add(record)
        db.session.commit()
    allrecord=Flats.query.all()
    return render_template('flat.html',allrecord=allrecord)

@main_bp.route('/check',methods=['GET','POST'])
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


@main_bp.route('/admincheck', methods=['GET', 'POST'])
def acheck():
    if request.method == 'POST':
        auname = request.form['aun']
        apassword = request.form['ap']

        if auname == "neetu" and apassword == "123":
            return render_template('adminpage.html')
        else:
            return "Admin not found"
    return "plese submit the form"

@main_bp.route('/guardentry', methods=['GET', 'POST'])
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

@main_bp.route('/result',methods=['GET','POST'])
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


@main_bp.route('/glogin', methods=['GET', 'POST'])
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
@main_bp.route('/api/flats')
def get_flats():
    flats = Flats.query.order_by(Flats.fnum).all()


    seen = set()
    unique_flats = []

    for f in flats:
        if f.fnum not in seen:
            seen.add(f.fnum)
            unique_flats.append({'fsno': f.fsno, 'fnum': f.fnum})

    return jsonify(unique_flats)


@main_bp.route('/generate_qr')
def generate_qr():
    url = "https://vms-rm2.onrender.com/visitor-entry"
    qr_img = qrcode.make(url)
    buf = io.BytesIO()
    qr_img.save(buf, format='PNG')
    buf.seek(0)
    return send_file(buf, mimetype='image/png')


# @app.route('/visitor_entry')
# def visitor_entry():
#     flats = Flats.query.order_by(Flats.fnum).all()  # if you want dropdown
#     return render_template('visitor_entry.html', flats=flats)



# from extensions import db
# from models import VReg

@main_bp.route("/visitor-entry", methods=["GET", "POST"])
def visitor_entry():
    if request.method == "POST":
        vfnum = request.form.get("vfnum")
        vfowner = request.form.get("vfowner")
        vname = request.form.get("vname")
        vwork = request.form.get("vwork")

        new_visitor = VReg(
            vfnum=vfnum,
            vfowner=vfowner,
            vname=vname,
            vwork=vwork,
            v_in=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            v_out=""
        )
        db.session.add(new_visitor)
        db.session.commit()
        return "Visitor entry recorded successfully!"

    # for GET
    flats = Flats.query.order_by(Flats.fnum).all()
    return render_template("visitor_entry.html", flats=flats)
