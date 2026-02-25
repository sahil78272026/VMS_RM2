from flask import jsonify, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt


def create_resident_routes(resident_service):
    bp = Blueprint("residents", __name__)

    @bp.route("/me/pending", methods=["GET"])
    # @jwt_required()
    def me_pending():
        # resident_id = int(get_jwt_identity())   # identity = user id
        # claims = get_jwt()                      # extra data
        # role = claims.get("role")

        # if role != "resident":
        #     return jsonify([{"error": "forbidden"}]), 403
        visits = resident_service.get_pending_visitors(15)
        out = [{
        "id": v.id, "visitor_name": v.visitor.name, "mobile": v.visitor.mobile,
        "purpose": v.purpose, "in_time": v.in_time.isoformat()
        } for v in visits]
        return jsonify(out)
    
    return bp