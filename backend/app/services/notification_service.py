from sqlalchemy.orm import Session
"""
Notification Service — sends push, SMS, and in-app notifications.
All notification logic centralised here.
Actual delivery delegated to provider modules (Twilio, Firebase).
"""

from datetime import datetime
import logging
logger = logging.getLogger(__name__)

from app.models import Notification, VisitorLog, PanicAlert, User
from app.repositories import NotificationRepository, FlatUserRepository, UserRepository


class NotificationService:

    def __init__(self, db: Session):
        self.db = db
        self.notif_repo     = NotificationRepository(db)
        self.flat_user_repo = FlatUserRepository(db)
        self.user_repo      = UserRepository(db)

    def _create_notification(
        self,
        user_id: int,
        notif_type: str,
        message: str,
        channel: str,
        visitor_log_id: int = None
    ) -> Notification:
        """Create and persist a notification record, then push via SSE."""
        notif = Notification(
            user_id        = user_id,
            visitor_log_id = visitor_log_id,
            type           = notif_type,
            channel        = channel,
            message        = message,
            status         = "sent",
            sent_at        = datetime.utcnow(),
        )
        self.notif_repo.save(notif)

        # Push real-time event via SSE
        self._push_sse(user_id, notif_type, {
            "id":             notif.id,
            "type":           notif_type,
            "message":        message,
            "visitor_log_id": visitor_log_id,
            "created_at":     notif.sent_at.isoformat() if notif.sent_at else None,
        })

        return notif

    def _push_sse(self, user_id: int, event_type: str, data: dict):
        """Fire-and-forget push to SSE event bus."""
        import asyncio
        from app.events.sse import event_bus
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(event_bus.publish(user_id, event_type, data))
            else:
                asyncio.run(event_bus.publish(user_id, event_type, data))
        except RuntimeError:
            # No event loop available (e.g. in tests) — silently skip
            logger.debug(f"[SSE] No event loop available, skipping push to user {user_id}")

    def _send_push(self, user_id: int, title: str, body: str):
        """Send Expo push notification."""
        try:
            import json, urllib.request
            user = self.user_repo.get_by_id(user_id)
            if not user or not user.expo_push_token:
                logger.info(f"[PUSH] Skipped: no expo_push_token for user {user_id}")
                return
            
            payload = {
                "to": user.expo_push_token,
                "title": title,
                "body": body,
                "sound": "default",
                "data": {"url": "rm2vms://resident?tab=dashboard"},
            }
            
            req = urllib.request.Request(
                "https://exp.host/--/api/v2/push/send",
                data=json.dumps(payload).encode('utf-8'),
                headers={"Accept": "application/json", "Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req) as response:
                res_body = response.read()
                logger.info(f"[PUSH] → user {user_id}: {title} (Expo: {res_body.decode('utf-8')})")
        except Exception as e:
            logger.error(f"[PUSH] Failed for user {user_id}: {e}")

    def _send_sms(self, phone: str, message: str):
        """Send Twilio SMS as fallback."""
        try:
            # twilio_service.send(phone, message)
            logger.info(f"[SMS] → {phone}: {message[:50]}...")
        except Exception as e:
            logger.error(f"[SMS] Failed for {phone}: {e}")

    def notify_approval_request(self, log: VisitorLog):
        """
        Notify all approvers of a flat when a visitor arrives.
        Sends push first. SMS as fallback if push fails.
        """
        approvers = self.flat_user_repo.get_approvers_by_flat(log.flat_id)

        for flat_user in approvers:
            user = self.user_repo.get_by_id(flat_user.user_id)
            if not user:
                continue

            message = (
                f"{log.visitor.name} wants to visit you at Flat {log.flat.flat_number}. "
                f"Purpose: {log.purpose}. Please approve or deny."
            )

            # In-app notification
            self._create_notification(
                user_id        = user.id,
                notif_type     = "approval_request",
                message        = message,
                channel        = "in_app",
                visitor_log_id = log.id,
            )

            # Push notification
            self._send_push(user.id, "Visitor at Gate 🔔", message)

            # SMS fallback
            self._send_sms(user.phone, message)

            logger.info(f"[NOTIF] Approval request sent to user {user.id} for log {log.id}")

    def notify_guard_of_approval(self, log: VisitorLog):
        """Notify guard dashboard when resident approves — real-time SSE event."""
        # Push SSE event to all active guard connections
        from app.models import Guard
        guards = self.db.query(Guard).all()
        for guard in guards:
            self._push_sse(guard.user_id, "visitor_approved", {
                "visitor_log_id": log.id,
                "flat_number":    log.flat.flat_number if log.flat else None,
                "visitor_name":   log.visitor.name if log.visitor else None,
                "message":        f"Visitor {log.visitor.name} approved for Flat {log.flat.flat_number}",
            })
        logger.info(f"[NOTIF] Guard notified of approval for log {log.id} via SSE")

    def notify_overdue(self, log: VisitorLog):
        """
        Alert resident and guard when visitor is overdue.
        Sent once when status first transitions to overdue.
        """
        # Notify resident
        flat_user = self.flat_user_repo.get_primary_by_flat(log.flat_id)
        if flat_user:
            user    = self.user_repo.get_by_id(flat_user.user_id)
            message = (
                f"Your visitor {log.visitor.name} has been inside for longer than expected. "
                f"Did they leave? Please confirm their departure."
            )
            self._create_notification(
                user_id        = user.id,
                notif_type     = "overdue_alert",
                message        = message,
                channel        = "push",
                visitor_log_id = log.id,
            )
            self._send_push(user.id, "Visitor Overdue ⚠️", message)
            self._send_sms(user.phone, message)

        logger.warning(f"[NOTIF] Overdue alert sent for log {log.id}")

    def notify_panic_alert(self, alert: PanicAlert):
        """Send panic alert to ALL admins immediately."""
        admins = self.user_repo.get_active_by_role("admin")
        message = (
            f"🚨 PANIC ALERT triggered by {alert.triggered_by_user.name} "
            f"({'Gate' if alert.gate_id else 'Flat'} level). "
            f"Message: {alert.message or 'No details provided'}"
        )

        for admin in admins:
            self._create_notification(
                user_id    = admin.id,
                notif_type = "panic_alert",
                message    = message,
                channel    = "push",
            )
            self._send_push(admin.id, "🚨 PANIC ALERT", message)
            self._send_sms(admin.phone, message)

        logger.critical(f"[PANIC] Alert triggered — notified {len(admins)} admin(s)")

    def notify_maintenance_approved(self, payment):
        from app.repositories import FlatUserRepository
        approvers = self.flat_user_repo.get_approvers_by_flat(payment.flat_id)
        for flat_user in approvers:
            user = self.user_repo.get_by_id(flat_user.user_id)
            if not user: continue
            msg = f"Your maintenance payment of ₹{payment.amount} has been approved! Flat {payment.flat.flat_number} is now active."
            self._create_notification(user.id, "bill_due", msg, "push")
            self._send_push(user.id, "Maintenance Approved ✅", msg)

    def notify_maintenance_reminder(self, flat, days_left):
        approvers = self.flat_user_repo.get_approvers_by_flat(flat.id)
        for flat_user in approvers:
            user = self.user_repo.get_by_id(flat_user.user_id)
            if not user: continue
            msg = f"Reminder: Maintenance for Flat {flat.flat_number} expires in {days_left} days. Please renew soon to avoid interruption."
            self._create_notification(user.id, "bill_due", msg, "push")
            self._send_push(user.id, "Maintenance Expiring Soon ⚠️", msg)

    def notify_maintenance_overdue(self, flat):
        approvers = self.flat_user_repo.get_approvers_by_flat(flat.id)
        for flat_user in approvers:
            user = self.user_repo.get_by_id(flat_user.user_id)
            if not user: continue
            msg = f"Alert: Maintenance for Flat {flat.flat_number} is currently overdue. Please pay immediately."
            self._create_notification(user.id, "bill_due", msg, "push")
            self._send_push(user.id, "Maintenance Overdue ❌", msg)

    def notify_announcement(self, announcement):
        """Notify all residents of a new announcement."""
        from app.repositories import FlatUserRepository
        from app.models import FlatUser
        all_flat_users = self.db.query(FlatUser).filter_by(role="primary").all()

        for fu in all_flat_users:
            user = self.user_repo.get_by_id(fu.user_id)
            if not user:
                continue
            message = f"📢 {announcement.title}: {announcement.body[:100]}..."
            self._create_notification(
                user_id    = user.id,
                notif_type = "announcement",
                message    = message,
                channel    = "in_app",
            )
            if announcement.priority == "urgent":
                self._send_push(user.id, f"📢 {announcement.title}", message)

        logger.info(f"[NOTIF] Announcement {announcement.id} sent to all residents")

    def get_for_user(self, user_id: int, page: int = 1, per_page: int = 20):
        return self.notif_repo.get_by_user(user_id, page, per_page)

    def get_unread_count(self, user_id: int) -> int:
        return self.notif_repo.get_unread_count(user_id)

    def mark_read(self, user_id: int, notif_id: int):
        from app.utils.exceptions import NotFoundError, ForbiddenError
        notif = self.notif_repo.get_by_id(notif_id)
        if not notif:
            raise NotFoundError("Notification")
        if notif.user_id != user_id:
            raise ForbiddenError("This notification does not belong to you")
        notif.status = "delivered"
        self.notif_repo.save(notif)
        return notif

    def mark_all_read(self, user_id: int) -> int:
        from app.models import Notification
        notifs = self.db.query(Notification).filter_by(user_id=user_id, status="sent").all()
        for n in notifs:
            n.status = "delivered"
            self.notif_repo.save(n)
        return len(notifs)
