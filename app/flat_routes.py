from flask import Blueprint, jsonify
from .models import Flat

bp = Blueprint("flats", __name__)

@bp.route("/flats", methods=["GET"])
def get_flats():
    flats = Flat.query.order_by(Flat.number).all()
    return jsonify([
        {
            "id": f.id,
            "number": f.number
        }
        for f in flats
    ])
