from flask import Blueprint, jsonify
from .models.models import Announcement
from datetime import datetime


bp = Blueprint("announcements", __name__)


@bp.route("/announcements", methods=["GET"])
def get_active_announcements():
    now = datetime.utcnow()

    anns = Announcement.query.filter(
        Announcement.start_time <= now,
        Announcement.end_time >= now
    ).order_by(Announcement.start_time.desc()).all()

    return jsonify([
        {
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "type": a.type,
            "start_time": a.start_time.isoformat(),
            "end_time": a.end_time.isoformat()
        }
        for a in anns
    ])