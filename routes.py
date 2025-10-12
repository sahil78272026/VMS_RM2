from models import Flats, Visitors, Guard, Residents
from extensions import db
from flask import request, session, render_template, send_file, jsonify, Blueprint, flash, redirect, url_for
from datetime import datetime
import io, qrcode


main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def hello():
    return render_template('home.html')

@main_bp.route('/ventry')
def ventry():
    all_record = Visitors.query.all()
    return render_template('visiterreg.html', vallrecord=all_record)


@main_bp.route('/home')
def home():
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


        vfo = request.form['vfowner']
        vn = request.form['vname']
        vw = request.form['vwork']
        vi = request.form['vintt']
        vo = request.form['voutt']

        vrecord=Visitors(flat_id=1, vfowner=vfo,vname=vn,vwork=vw,v_in=vi,v_out=vo, guard_id=1)
        db.session.add(vrecord)
        db.session.commit()
    vallrecord=Visitors.query.all()
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
            unique_flats.append({'fsno': f.fsno, 'fnum': f.fnum, 'fowner': f.fowner})
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
        fn=request.form['fnum']
        vn=request.form['vn']
        vw=request.form['vw']


        flat = Flats.query.filter_by(fnum=fn).first()
        if flat:

            return render_template('flat.html', flat=flat,vn=vn,vw=vw)
        else:
            return "Flat number not found"
    return "Please submit the form"

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


@main_bp.route('/admincheck', methods=['GET', 'POST'])
def acheck():
    if request.method == 'POST':
        auname = request.form['aun']
        apassword = request.form['ap']

        if auname == "admin" and apassword == "admin":
            return render_template('adminpage.html')
        else:
            return "Admin not found"
    return "plese submit the form"

#******************Guard************************

@main_bp.route('/gourdl')
def gourd_l():
    flats = Flats.query.order_by(Flats.fnum).all()
    if session.get('guard_logged_in'):
        return render_template("visitor_entry.html", flats=flats)

    return render_template('glogin.html')


@main_bp.route('/guardentry', methods=['GET', 'POST'])
def guardentry():
    if request.method == 'POST':
        action = request.form.get('action')
        id = request.form.get('id')
        gun = request.form.get('guname')
        gpw = request.form.get('gpw')
        gm  = request.form.get('gm')


        if action == "add":
            new_guard = Guard(id=id, guname=gun, gpassword=gpw, gmobile=gm)
            db.session.add(new_guard)
            db.session.commit()
            print("Guard added successfully!")

        elif action == "delete":
            record = Guard.query.get(id)
            if record:
                db.session.delete(record)
                db.session.commit()
            else:
                print("Guard not found!")

        elif action == "update":
            record = Guard.query.get(id)
            if record:
                record.guname = gun
                record.gpassword = gpw
                record.gmobile = gm
                db.session.commit()
            else:
                print("Guard not found!")

    allrecord = Guard.query.all()
    return render_template('guardentry.html', allrecord=allrecord)


@main_bp.route('/glogin', methods=['GET', 'POST'])
def glogin():
    flats = Flats.query.order_by(Flats.fnum).all()

    if request.method == 'POST':
        a = request.form['guname']
        b = request.form['gpw']

        if not a or not b:
            return "Please enter both username and password"

        x = Guard.query.filter_by(guname=a).first()

        if x and x.gpassword == b:
            session['guard_logged_in'] = True
            return render_template("visitor_entry.html", flats=flats)
        else:
            return "Permission denied or invalid answer"

    if session.get('guard_logged_in'):
        return render_template("visitor_entry.html", flats=flats)

    return render_template('glogin.html')



@main_bp.route('/api/flats')
def get_flats():
    flats = Flats.query.order_by(Flats.fnum).all()
    seen = set()
    unique_flats = []

    for f in flats:
        if f.fnum not in seen:
            seen.add(f.fnum)
            unique_flats.append({'fsno': f.id, 'fnum': f.fnum})

    return jsonify(unique_flats)


@main_bp.route('/generate_qr')
def generate_qr():
    url = "https://vms-rm2.onrender.com/visitor-entry"
    qr_img = qrcode.make(url)
    buf = io.BytesIO()
    qr_img.save(buf, format='PNG')
    buf.seek(0)
    return send_file(buf, mimetype='image/png')


@main_bp.route("/visitor-entry", methods=["GET", "POST"])
def visitor_entry():
    if request.method == "POST":
        flat_id = request.form.get("flat_id")
        vname = request.form.get("vname")
        vwork = request.form.get("vwork")
        guard_id = request.form.get('guard_id')

        new_visitor = Visitors(
            flat_id=flat_id,
            vfowner="123",
            vname=vname,
            vwork=vwork,
            guard_id=guard_id,
            v_in=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            v_out=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        db.session.add(new_visitor)
        db.session.commit()
        return "Visitor entry recorded successfully!"

    # for GET
    flats = Flats.query.order_by(Flats.fnum).all()
    guards = Guard.query.order_by(Guard.guname).all()

    return render_template("visitor_entry.html", flats=flats, guards=guards)


@main_bp.route("/resident/register", methods=["GET", "POST"])
def resident_register():
    if request.method == "POST":
        name = request.form["name"]
        mobile = request.form["mobile"]
        email = request.form["email"]
        password = request.form["password"]
        flat_id = request.form["flat_id"]

        existing = Residents.query.filter_by(mobile=mobile).first()
        if existing:
            flash("Mobile number already registered!", "danger")
            return redirect(url_for("main.resident_register"))

        resident = Residents(name=name, mobile=mobile, email=email, flat_id=flat_id)
        resident.set_password(password)
        db.session.add(resident)
        db.session.commit()

        flash("Registration successful! Please log in.", "success")
        return redirect(url_for("main.resident_login"))

    flats = Flats.query.all()
    return render_template("resident_register.html", flats=flats)


# 🔹 Login Page
@main_bp.route("/resident/login", methods=["GET", "POST"])
def resident_login():
    if request.method == "POST":
        mobile = request.form["mobile"]
        password = request.form["password"]

        resident = Residents.query.filter_by(mobile=mobile).first()
        if resident and resident.check_password(password):
            session["resident_id"] = resident.id
            session["resident_name"] = resident.name
            flash("Logged in successfully!", "success")
            return redirect(url_for("main.resident_dashboard"))
        else:
            flash("Invalid credentials!", "danger")

    return render_template("resident_login.html")


# 🔹 Dashboard
@main_bp.route("/resident/dashboard")
def resident_dashboard():
    if "resident_id" not in session:
        return redirect(url_for("main.resident_login"))
    return render_template("resident_dashboard.html", name=session.get("resident_name"))


# 🔹 Logout
@main_bp.route("/resident/logout")
def resident_logout():
    session.clear()
    flash("Logged out successfully.", "info")
    return redirect(url_for("main.resident_login"))


@main_bp.route("/api/pending_visitors", methods=["GET"])
def get_pending_visitors():
    # pending_visitors = Visitors.query.filter_by(approved=False).all()
    pending_visitors = Visitors.query.all()
    data = [
        {
            "id": v.id,
            "name": v.vname,
            "flat": v.flat.fnum,
            "owner": v.flat.fowner,
            "purpose": v.vwork,
            "in_time": v.v_in,
        }
        for v in pending_visitors
    ]
    return jsonify(data)


@main_bp.route("/api/approve_visitor/<int:visitor_id>", methods=["POST"])
def approve_visitor(visitor_id):
    visitor = Visitors.query.get(visitor_id)
    if visitor:
        visitor.approved = True
        db.session.commit()
        return jsonify({"status": "approved"})
    return jsonify({"error": "Visitor not found"}), 404


@main_bp.route("/api/reject_visitor/<int:visitor_id>", methods=["POST"])
def reject_visitor(visitor_id):
    visitor = Visitors.query.get(visitor_id)
    if visitor:
        db.session.delete(visitor)
        db.session.commit()
        return jsonify({"status": "rejected"})
    return jsonify({"error": "Visitor not found"}), 404
