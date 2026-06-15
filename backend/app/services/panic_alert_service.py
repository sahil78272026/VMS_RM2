from sqlalchemy.orm import Session
"""
Panic Alert Service
"""
from datetime import datetime
import logging
logger = logging.getLogger(__name__)
from app.models import PanicAlert
from app.repositories import PanicAlertRepository
from app.utils.exceptions import NotFoundError, ForbiddenError


class PanicAlertService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PanicAlertRepository(db)

    def trigger(self, user_id: int, role: str, gate_id: int = None,
                flat_id: int = None, message: str = None):
        """Trigger a panic alert. Notifies all admins immediately."""
        alert = PanicAlert(
            triggered_by = user_id,
            role         = role,
            gate_id      = gate_id,
            flat_id      = flat_id,
            message      = message,
            status       = "active",
        )
        self.repo.save(alert)

        # Notify all admins immediately
        from app.services.notification_service import NotificationService
        NotificationService(self.db).notify_panic_alert(alert)

        logger.critical(
            f"[PANIC] Triggered by user {user_id} ({role}) "
            f"| gate: {gate_id} | flat: {flat_id} | msg: {message}"
        )
        return alert

    def get_active(self):
        return self.repo.get_active()

    def get_all(self, status=None, page=1, per_page=20):
        from app.models import PanicAlert as PA
        q = self.db.query(PA)
        if status:
            q = q.filter_by(status=status)
        q = q.order_by(PA.created_at.desc())
        return self.repo.paginate(page=page, per_page=per_page, query=q)

    def resolve(self, alert_id: int, admin_user_id: int):
        alert = self.repo.get_by_id(alert_id)
        if not alert:
            raise NotFoundError("Panic alert")
        if alert.status == "resolved":
            raise ForbiddenError("Alert is already resolved")

        alert.status      = "resolved"
        alert.resolved_by = admin_user_id
        alert.resolved_at = datetime.utcnow()
        self.repo.save(alert)

        logger.info(f"[PANIC] Resolved alert {alert_id} by admin {admin_user_id}")
        return alert
