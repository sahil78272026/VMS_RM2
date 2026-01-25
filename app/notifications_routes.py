from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from .models import Visit, Flat, Guard, Resident, Announcement, Service, PushSubscription
from .extensions import db
from datetime import datetime
from pywebpush import webpush

bp = Blueprint("notifications",__name__)


@bp.route("/notifications/status")
@jwt_required()
def notification_status():
    resident_id = get_jwt_identity()
    exists = PushSubscription.query.filter_by(resident_id=resident_id).first() is not None
    return ({"enabled":exists})

@bp.route("/notifications/subscribe")
@jwt_required()
def subscribe():
    data = request.json
    resident_id = get_jwt_identity()
    sub = PushSubscription(resident_id=resident_id, 
                            endpoint=data['endpoint'], 
                            p256dh=data['keys']['p256dh'], 
                            auth=data['keys']['auth'] )
    db.session.add(sub)
    db.session.commit()
    return ({"message":"Notification Enabled"})


def notify_resident(resident_id):
    subs = PushSubscription.query.filter_by(resident_id=resident_id).all()

    for s in subs:
        webpush(
            subscription_info={
                "endpoint": s.endpoint,
                "keys": {
                    "p256dh": s.p256dh,
                    "auth": s.auth
                }
            },
            data="Visitor waiting for your approval",
            vapid_private_key=os.getenv("VAPID_PRIVATE_KEY"),
            vapid_claims={"sub": "mailto:admin@society.com"}
        )

