from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from .models import Visit, Flat, Guard
from .extensions import db
from datetime import datetime



bp = Blueprint("admin",__name__)


@bp.route("/admin/flats", methods=["GET", "POST"])
@jwt_required()
def manage_flats():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return {"error": "forbidden"}, 403

    if request.method == "GET":
        flats = Flat.query.order_by(Flat.number).all()
        return jsonify([
            {"id": f.id, "number": f.number}
            for f in flats
        ])

    if request.method == "POST":
        number = request.json.get("number")
        db.session.add(Flat(number=number))
        db.session.commit()
        return {"message": "Flat added"}

def admin_only():
    claims = get_jwt()
    return claims.get("role") == "admin"


@bp.route("/admin/guards", methods=["GET"])
@jwt_required()
def get_guards():
    if not admin_only():
        return {"error": "forbidden"}, 403

    guards = Guard.query.order_by(Guard.id.desc()).all()

    return jsonify([
        {
            "id": g.id,
            "name": g.name,
            "mobile": g.mobile,
            "is_active": g.is_active
        }
        for g in guards
    ])


@bp.route("/admin/guards", methods=["POST"])
@jwt_required()
def create_guard():
    if not admin_only():
        return {"error": "forbidden"}, 403

    data = request.json
    name = data.get("name")
    mobile = data.get("mobile")
    password = data.get("password")

    if not name or not mobile or not password:
        return {"error": "Missing fields"}, 400

    if Guard.query.filter_by(mobile=mobile).first():
        return {"error": "Guard already exists"}, 400

    guard = Guard(name=name, mobile=mobile)
    guard.set_password(password)

    db.session.add(guard)
    db.session.commit()

    return {"message": "Guard created"}

@bp.route("/admin/guards/<int:guard_id>/toggle", methods=["POST"])
@jwt_required()
def toggle_guard(guard_id):
    if not admin_only():
        return {"error": "forbidden"}, 403

    guard = Guard.query.get_or_404(guard_id)
    guard.is_active = not guard.is_active

    db.session.commit()

    return {
        "message": "Updated",
        "is_active": guard.is_active
    }

