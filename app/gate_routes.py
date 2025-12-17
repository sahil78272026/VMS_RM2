from .models import GateStatus
from  flask import Blueprint, jsonify


bp = Blueprint("gate",__name__)



@bp.route("/gate/status", methods=["GET"])
def get_gate_status():
    gate = GateStatus.query.filter_by(gate_name="BACK_GATE").first()

    if not gate:
        return jsonify({
            "gate": "BACK_GATE",
            "status": "UNKNOWN"
        })

    return jsonify({
        "gate": gate.gate_name,
        "status": gate.status,
        "updated_at": gate.updated_at,
        "updated_by": gate.updated_by
    })