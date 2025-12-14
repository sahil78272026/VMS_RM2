from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from .models import Resident, Visit
from .extensions import db

bp = Blueprint("residents", __name__)

@bp.route("/me/pending", methods=["GET"])
@jwt_required()
def me_pending():
    resident_id = int(get_jwt_identity())   # identity = user id
    claims = get_jwt()                      # extra data
    role = claims.get("role")

    if role != "resident":
        return jsonify({"error": "forbidden"}), 403
    resident = Resident.query.get(resident_id)
    visits = Visit.query.filter_by(flat_id=resident.flat_id, status="PENDING").all()
    out = [{
        "id": v.id, "visitor_name": v.visitor.name, "mobile": v.visitor.mobile,
        "purpose": v.purpose, "in_time": v.in_time.isoformat()
    } for v in visits]
    return jsonify(out)

@bp.route("/visit/<int:visit_id>/approve", methods=["POST"])
@jwt_required()
def approve(visit_id):
    user_id = int(get_jwt_identity())   # identity is string → convert to int
    claims = get_jwt()
    role = claims.get("role")

    if role != "resident":
        return jsonify({"error": "forbidden"}), 403

    v = Visit.query.get_or_404(visit_id)
    v.status = "APPROVED"
    db.session.commit()

    return jsonify({"message": "approved"})

@bp.route("/visit/<int:visit_id>/reject", methods=["POST"])
@jwt_required()
def reject(visit_id):
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    if role != "resident":
        return jsonify({"error": "forbidden"}), 403

    v = Visit.query.get_or_404(visit_id)
    v.status = "REJECTED"
    db.session.commit()

    return jsonify({"message": "rejected"})

