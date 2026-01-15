from flask import Blueprint, request, jsonify
from .models import Resident, Guard, Visitor, Admin
from .extensions import db
from flask_jwt_extended import create_access_token


bp = Blueprint("auth", __name__)


@bp.route("/ping")
def ping():
    print("pong")
    return "pong"

@bp.route("/resident/register", methods=["POST"])
def resident_register():
    data = request.json
    if Resident.query.filter_by(mobile=data["mobile"]).first():
        return jsonify({"error":"Mobile exists"}), 400
    r = Resident(name=data["name"], mobile=data["mobile"], email=data.get("email"), flat_id=data["flat_id"])
    r.set_password(data["password"])
    db.session.add(r); db.session.commit()
    return jsonify({"message":"ok"}), 201

@bp.route("/resident/login", methods=["POST"])
def resident_login():
    data = request.json or {}

    mobile = data.get("mobile")
    password = data.get("password")

    if not mobile or not password:
        return jsonify({"error": "Mobile and password required"}), 400

    r = Resident.query.filter_by(mobile=mobile).first()

    if not r or not r.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    if not r.is_approved:
        return jsonify({
            "error": "Account pending admin approval"
        }), 403

    access_token = create_access_token(
        identity=str(r.id),  # MUST be string
        additional_claims={"role": "resident"}
    )

    return jsonify({
        "access_token": access_token,
        "resident": {
            "id": r.flat.number,
            "name": r.name
        }
    }), 200



@bp.route("/visitor/login", methods=["POST"])
def visitor_login():
    data = request.json
    visitor = Visitor.query.filter_by(mobile=data["mobile"]).first()

    if not visitor:
        return jsonify({"error": "visitor not found"}), 404

    token = create_access_token(
        identity=str(visitor.id),
        additional_claims={"role": "visitor"}
    )
    return jsonify({"access_token": token})


@bp.route("/guard/login", methods=["POST"])
def guard_login():
    data = request.json
    mobile = data.get("mobile")
    password = data.get("password")

    guard = Guard.query.filter_by(mobile=mobile, is_active=True).first()

    if not guard or not guard.check_password(password):
        return {"error": "Invalid credentials"}, 401

    access_token = create_access_token(
        identity=str(guard.id),
        additional_claims={"role": "guard"}
    )

    return {
        "access_token": access_token,
        "guard": {
            "id": guard.id,
            "name": guard.name
        }
    }



@bp.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.json
    mobile = data.get("mobile")
    password = data.get("password")
    print(mobile)
    print(password)

    if not mobile or not password:
        return {"error": "Missing credentials"}, 400

    admin = Admin.query.filter_by(mobile=mobile, is_active=True).first()

    if not admin or not admin.check_password(password):
        return {"error": "Invalid credentials"}, 401

    access_token = create_access_token(
        identity=str(admin.id),
        additional_claims={"role": "admin"}
    )

    return jsonify({
        "access_token": access_token,
        "admin": {
            "id": admin.id,
            "name": admin.name
        }
    })

