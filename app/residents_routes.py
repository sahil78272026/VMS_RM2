from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from .models import Resident, Visit, Announcement, Visitor
from .extensions import db

bp = Blueprint("residents", __name__)

@bp.route("/me/pending", methods=["GET"])
@jwt_required()
def me_pending():
    resident_id = int(get_jwt_identity())   # identity = user id
    claims = get_jwt()                      # extra data
    role = claims.get("role")

    if role != "resident":
        return jsonify([{"error": "forbidden"}]), 403
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


from datetime import datetime

@bp.route("/announcements", methods=["GET"])
@jwt_required(optional=True)
def get_announcements():
    now = datetime.utcnow()

    anns = Announcement.query.filter(
        Announcement.start_time <= now,
        Announcement.end_time >= now
    ).order_by(Announcement.start_time.desc()).all()

    return [
        {
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "type": a.type,
            "start_time": a.start_time,
            "end_time": a.end_time
        }
        for a in anns
    ]


@bp.route("/visits/expected", methods=["POST"])
@jwt_required()
def create_expected_visit():
    claims = get_jwt()
    if claims.get("role") != "resident":
        return {"error": "Forbidden"}, 403

    data = request.json or {}

    visitor_name = data.get("name")
    mobile = data.get("mobile")
    purpose = data.get("purpose")

    if not all([visitor_name, mobile, purpose]):
        return {"error": "Missing required fields"}, 400

    resident_id = int(get_jwt_identity())

    # 🔐 Get resident & flat from DB
    resident = Resident.query.get_or_404(resident_id)
    flat_id = resident.flat_id

    # 🔍 Find or create visitor
    visitor = Visitor.query.filter_by(mobile=mobile).first()
    if not visitor:
        visitor = Visitor(name=visitor_name, mobile=mobile)
        db.session.add(visitor)
        db.session.flush()

    # ✅ Create APPROVED visit
    visit = Visit(
        visitor_id=visitor.id,
        flat_id=flat_id,
        purpose=purpose,
        status="APPROVED",
        in_time=datetime.utcnow()
    )

    db.session.add(visit)
    db.session.commit()

    return {
        "message": "Expected visitor added successfully",
        "visit_id": visit.id
    }, 201


@bp.get("/profile")
@jwt_required()
def residentProfile():
    claims = get_jwt()
    if claims.get("role") != "resident":
        return {"error": "Forbidden"}, 403

    resident_id = int(get_jwt_identity())

    # 🔐 Get resident & flat from DB
    resident = Resident.query.get_or_404(resident_id)
    name = resident.name
    flat_number = resident.flat.number
    return jsonify({"name":name, "flat":flat_number})
