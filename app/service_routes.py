from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from .models import Service


bp = Blueprint("services", __name__)



@bp.route("/services", methods=["GET"])
@jwt_required()
def list_services():
    claims = get_jwt()
    if claims.get("role") not in ["admin", "resident"]:
        return {"error": "Forbidden"}, 403

    service_type = request.args.get("type")

    query = Service.query
    if claims.get("role") == "resident":
        query = query.filter_by(is_active=True)

    if service_type:
        query = query.filter_by(type=service_type)

    services = query.all()

    return [{
        "id": s.id,
        "name": s.name,
        "type": s.type,
        "phone": s.phone,
        "is_active": s.is_active
    } for s in services]
