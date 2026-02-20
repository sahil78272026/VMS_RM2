from flask import Blueprint, request, jsonify
from app.models import Visitor, Visit, Flat, Resident
from app.extensions import db
from app.notifications_routes import notify_resident
from app.dto.visitor_dto import VisitorEntryDTO
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt



def create_visitor_routes(visitor_service):
    bp = Blueprint("visitors", __name__)

    @bp.route("/entry", methods=["POST"])
    def visitor_entry():
        dto = VisitorEntryDTO(**request.json)
        visit = visitor_service.create_entry(dto)
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
    return bp
