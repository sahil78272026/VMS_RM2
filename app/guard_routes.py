from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from .models import Visit, Flat, GateStatus
from .extensions import db
from datetime import datetime

bp = Blueprint("guards", __name__)

@bp.route("/approved", methods=["GET"])
@jwt_required()
def approved():
    ident = get_jwt_identity()
    if ident.get("role") != "guard":
        return jsonify({"error":"forbidden"}), 403
    visits = Visit.query.filter_by(status="APPROVED").all()
    return jsonify([{"id":v.id,"visitor":v.visitor.name,"flat":v.flat.number,"purpose":v.purpose,"in_time":v.in_time.isoformat()} for v in visits])

@bp.route("/visit/<int:visit_id>/complete", methods=["POST"])
@jwt_required()
def complete(visit_id):
    claims = get_jwt()               # ✅ role lives here
    guard_id = get_jwt_identity()    # ✅ this is a string ID

    if claims.get("role") != "guard":
        return {"error": "forbidden"}, 403

    visit = Visit.query.get_or_404(visit_id)

    if visit.status != "APPROVED":
        return {"error": "Visit not approved"}, 400

    visit.status = "ENTERED"
    visit.in_time = datetime.utcnow()

    db.session.commit()

    return {"message": "Entry allowed"}

@bp.route("/visits", methods=["GET"])
@jwt_required()
def guard_visits():
    claims = get_jwt()

    if claims.get("role") != "guard":
        return {"error": "forbidden"}, 403

    visits = (
        db.session.query(Visit, Flat)
        .join(Flat, Visit.flat_id == Flat.id)
        .order_by(Visit.in_time.desc())
        .all()
    )

    return jsonify([
        {
            "id": v.id,
            "visitor_name": v.visitor.name,
            "mobile": v.visitor.mobile,
            "flat_number": f.number,
            "purpose": v.purpose,
            "status": v.status,
            "created_at": v.in_time.isoformat(),
        }
        for v, f in visits])


@bp.route("/gate/toggle", methods=["POST"])
@jwt_required()
def toggle_gate():
    claims = get_jwt()
    if claims.get("role") != "guard":
        return {"error": "forbidden"}, 403

    gate = GateStatus.query.filter_by(gate_name="BACK_GATE").first()

    if not gate:
        gate = GateStatus(
            gate_name="BACK_GATE",
            status="CLOSED"
        )

    # 🔁 TOGGLE
    gate.status = "OPEN" if gate.status == "CLOSED" else "CLOSED"
    gate.updated_at = datetime.utcnow()
    gate.updated_by = str(get_jwt_identity())

    db.session.add(gate)
    db.session.commit()

    return {
        "gate": gate.gate_name,
        "status": gate.status
    }


