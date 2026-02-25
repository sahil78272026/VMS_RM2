from flask import Blueprint, request, jsonify
from app.extensions import db
# from app.notifications_routes import notify_resident
from app.dto.visitor_dto import VisitorEntryDTO, VisitorLookUpDTO
from app.dto.visit_response_dto import VisitResponseDTO
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
        dto = VisitorLookUpDTO(**request.args)      
        visitor = visitor_service.lookup(dto)
        return jsonify(visitor)



    @bp.route("/my-visits", methods=["GET"])
    @jwt_required()
    def my_visits():
        visitor_id = int(get_jwt_identity())
        claims = get_jwt()

        if claims.get("role") != "visitor":
            return jsonify({"error": "forbidden"}), 403
        visits = visitor_service.get_my_visits(visitor_id)
        dto_obj = [VisitResponseDTO.from_model(v) for v in visits]
        return jsonify(dto_obj)

    return bp
