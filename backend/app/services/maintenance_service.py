from sqlalchemy.orm import Session
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
import logging

logger = logging.getLogger(__name__)

from app.models import MaintenancePayment, Flat
from app.repositories import FlatRepository
from app.utils.exceptions import NotFoundError, ValidationError, ConflictError

class MaintenanceService:
    def __init__(self, db: Session):
        self.db = db
        self.flat_repo = FlatRepository(db)

    def get_flat_maintenance(self, flat_id: int):
        flat = self.flat_repo.get_by_id(flat_id)
        if not flat:
            raise NotFoundError("Flat")
        return flat.to_dict()

    def get_my_payments(self, flat_id: int):
        payments = self.db.query(MaintenancePayment).filter_by(flat_id=flat_id).order_by(MaintenancePayment.created_at.desc()).all()
        return [p.to_dict() for p in payments]

    def submit_payment(self, flat_id: int, user_id: int, data: dict):
        if not data.get("months_added"): raise ValidationError({"months_added": "Required"})
        if not data.get("amount"): raise ValidationError({"amount": "Required"})
        if not data.get("utr_number"): raise ValidationError({"utr_number": "Required"})

        payment = MaintenancePayment(
            flat_id=flat_id,
            paid_by=user_id,
            amount=data["amount"],
            months_added=data["months_added"],
            utr_number=data["utr_number"],
            status="pending"
        )
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def admin_get_pending_payments(self):
        payments = self.db.query(MaintenancePayment).filter_by(status="pending").order_by(MaintenancePayment.created_at.desc()).all()
        return [p.to_dict() for p in payments]

    def admin_get_all_flats(self, page: int = 1, per_page: int = 20, search_query: str = ""):
        from app.models import Flat
        from sqlalchemy import func, cast, Integer, text
        q = self.db.query(Flat)
        if search_query:
            q = q.filter(Flat.flat_number.ilike(f"%{search_query}%"))
        # Natural sort: extract numeric prefix as integer, then sort by suffix
        numeric_part = cast(
            func.regexp_replace(Flat.flat_number, '[^0-9]', '', 'g'),
            Integer
        )
        suffix_part = func.regexp_replace(Flat.flat_number, '[0-9]', '', 'g')
        q = q.order_by(numeric_part.asc(), suffix_part.asc())
        
        paginated = self.flat_repo.paginate(page=page, per_page=per_page, query=q)
        return {
            "items": [f.to_dict() for f in paginated["items"]],
            "total": paginated["meta"]["total"],
            "page": paginated["meta"]["page"],
            "pages": paginated["meta"]["pages"]
        }

    def admin_approve_payment(self, payment_id: int):
        payment = self.db.query(MaintenancePayment).filter_by(id=payment_id).first()
        if not payment:
            raise NotFoundError("Payment")
        if payment.status != "pending":
            raise ConflictError("Payment is not pending")

        # Update payment
        payment.status = "approved"
        payment.processed_at = datetime.utcnow()

        # Update flat validity
        flat = self.flat_repo.get_by_id(payment.flat_id)
        current_validity = flat.maintenance_valid_until or date.today()
        # If already expired, start from today. If active, add to existing validity.
        start_date = max(current_validity, date.today())
        flat.maintenance_valid_until = start_date + relativedelta(months=payment.months_added)
        
        self.db.commit()
        
        # Notify the user who paid
        from app.services.notification_service import NotificationService
        NotificationService(self.db).notify_maintenance_approved(payment)
        
        return payment

    def admin_reject_payment(self, payment_id: int):
        payment = self.db.query(MaintenancePayment).filter_by(id=payment_id).first()
        if not payment:
            raise NotFoundError("Payment")
        if payment.status != "pending":
            raise ConflictError("Payment is not pending")

        payment.status = "rejected"
        payment.processed_at = datetime.utcnow()
        self.db.commit()
        return payment

    def daily_maintenance_check(self):
        """
        Background job — run daily.
        Checks all flats and sends reminders/overdue alerts.
        """
        flats = self.flat_repo.get_occupied()
        today = date.today()
        from app.services.notification_service import NotificationService
        ns = NotificationService(self.db)
        count = 0

        for flat in flats:
            valid_until = flat.maintenance_valid_until
            if not valid_until:
                ns.notify_maintenance_overdue(flat)
                count += 1
                continue
            
            days_left = (valid_until - today).days
            if days_left == 7:
                ns.notify_maintenance_reminder(flat, days_left)
                count += 1
            elif days_left < 0:
                # Modulo to only send every 7 days when overdue
                if abs(days_left) % 7 == 0:
                    ns.notify_maintenance_overdue(flat)
                    count += 1
                    
        if count:
            logger.info(f"[MAINTENANCE] Sent {count} daily reminder(s).")
        return count
