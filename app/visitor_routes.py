from flask import Blueprint, request, jsonify
from .models import Visitor, Visit, Flat
from .extensions import db
from .notifications_routes import notify_resident
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

bp = Blueprint("visitors", __name__)

@bp.route("/entry", methods=["POST"])
def visitor_entry():
    data = request.json
    mobile = data.get("mobile")
    visitor = Visitor.query.filter_by(mobile=mobile).first()
    if not visitor:
        visitor = Visitor(name=data.get("name"), mobile=mobile, company=data.get("company"))
        db.session.add(visitor)
    visitor.name = data.get("name") or visitor.name
    visitor.company = data.get("company") or visitor.company
    visitor.last_visited = datetime.utcnow()
    flat_num = Flat.query.filter_by(number=data["flat_id"]).first()

    visit = Visit(visitor=visitor, flat_id=flat_num.id, purpose=data["purpose"], status="PENDING")
    db.session.add(visit)
    db.session.commit()
    resident_id = Resident.query.filter_by(flat_id=flat_num).first()
    notify_resident(resident_id)
    return jsonify({"visit_id": visit.id}), 201

@bp.route("/lookup", methods=["GET"])
def visitor_lookup():
    mobile = request.args.get("mobile")
    visitor = Visitor.query.filter_by(mobile=mobile).first()
    if not visitor:
        return jsonify({"found": False})
    return jsonify({
        "found": True,
        "name": visitor.name,
        "company": visitor.company,
        "last_visited": visitor.last_visited.isoformat() if visitor.last_visited else None
    })



@bp.route("/my-visits", methods=["GET"])
@jwt_required()
def my_visits():
    visitor_id = int(get_jwt_identity())
    claims = get_jwt()

    if claims.get("role") != "visitor":
        return jsonify({"error": "forbidden"}), 403

    visits = Visit.query.filter_by(visitor_id=visitor_id)\
                        .order_by(Visit.in_time.desc()).all()

    return jsonify([
        {
            "id": v.id,
            "flat": v.flat.number,
            "purpose": v.purpose,
            "status": v.status,
            "in_time": v.in_time.isoformat(),
            "out_time": v.out_time.isoformat() if v.out_time else None
        }
        for v in visits
    ])
