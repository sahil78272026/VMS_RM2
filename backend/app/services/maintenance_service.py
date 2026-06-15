from sqlalchemy.orm import Session
"""
Maintenance Service — bill generation and payment recording.
"""
from datetime import datetime, date
import logging
logger = logging.getLogger(__name__)
from app.models import MaintenanceBill, Flat
from app.repositories import MaintenanceBillRepository, FlatRepository
from app.utils.exceptions import (
    NotFoundError, ValidationError, ConflictError, ForbiddenError
)


class MaintenanceService:
    def __init__(self, db: Session):
        self.db = db
        self.repo      = MaintenanceBillRepository(db)
        self.flat_repo = FlatRepository(db)

    def get_by_flat(self, flat_id: int):
        return self.repo.get_by_flat(flat_id)

    def get_by_id(self, bill_id: int):
        bill = self.repo.get_by_id(bill_id)
        if not bill:
            raise NotFoundError("Bill")
        return bill

    def get_overdue(self):
        return self.repo.get_overdue()

    def get_all(self, flat_id=None, status=None, schedule=None, page=1, per_page=20):
        from app.models import MaintenanceBill as MB
        q = self.db.query(MB)
        if flat_id:  q = q.filter_by(flat_id=flat_id)
        if status:   q = q.filter_by(status=status)
        if schedule: q = q.filter_by(schedule=schedule)
        q = q.order_by(MB.generated_at.desc())
        return self.repo.paginate(page=page, per_page=per_page, query=q)

    def generate(self, data: dict):
        """
        Generate bills for one flat or all occupied flats.
        If flat_id is provided — generate for that flat only.
        If flat_id is omitted  — generate for all occupied flats (bulk).
        """
        errors = {}
        if not data.get("bill_period"): errors["bill_period"] = "Required — e.g. 2026-03 or 2026-Q1"
        if not data.get("schedule"):    errors["schedule"]    = "Required — monthly|quarterly|half_yearly|yearly"
        if not data.get("amount"):      errors["amount"]      = "Required"
        if not data.get("due_date"):    errors["due_date"]    = "Required"
        if errors:
            raise ValidationError(errors)

        target_flat_ids = []

        if data.get("flat_id"):
            flat = self.flat_repo.get_by_id(data["flat_id"])
            if not flat:
                raise NotFoundError("Flat")
            target_flat_ids = [flat.id]
        else:
            # Bulk — all occupied flats
            occupied_flats  = self.flat_repo.get_occupied()
            target_flat_ids = [f.id for f in occupied_flats]

        bills = []
        for flat_id in target_flat_ids:
            # Skip if bill already generated for this period
            if self.repo.period_exists(flat_id, data["bill_period"]):
                logger.warning(
                    f"[MAINTENANCE] Bill already exists for flat {flat_id} "
                    f"period {data['bill_period']} — skipping"
                )
                continue

            bill = MaintenanceBill(
                flat_id     = flat_id,
                bill_period = data["bill_period"],
                schedule    = data["schedule"],
                amount      = data["amount"],
                due_date    = date.fromisoformat(data["due_date"]),
                status      = "unpaid",
            )
            self.repo.save(bill)
            bills.append(bill)

            # Send bill due notification
            from app.services.notification_service import NotificationService
            NotificationService(self.db).notify_bill_due(bill)

        logger.info(
            f"[MAINTENANCE] Generated {len(bills)} bill(s) "
            f"for period {data['bill_period']}"
        )
        return bills

    def pay(self, bill_id: int, user_id: int, data: dict):
        """Record payment for a bill."""
        errors = {}
        if not data.get("payment_mode"): errors["payment_mode"] = "Required"
        if not data.get("amount_paid"):  errors["amount_paid"]  = "Required"
        if errors:
            raise ValidationError(errors)

        bill = self.get_by_id(bill_id)

        if bill.status == "paid":
            raise ConflictError("This bill has already been paid")

        bill.paid_by         = user_id
        bill.amount_paid     = data["amount_paid"]
        bill.payment_mode    = data["payment_mode"]
        bill.transaction_ref = data.get("transaction_ref")
        bill.paid_at         = datetime.utcnow()
        bill.status          = "paid"

        self.repo.save(bill)
        logger.info(
            f"[MAINTENANCE] Bill {bill_id} paid by user {user_id} "
            f"via {bill.payment_mode} — ₹{bill.amount_paid}"
        )
        return bill

    def mark_overdue_bills(self):
        """
        Background job — run daily.
        Marks unpaid bills as overdue if due_date has passed.
        """
        from app.models import MaintenanceBill as MB
        today    = date.today()
        unpaid   = self.db.query(MB).filter_by(status="unpaid").filter(MB.due_date < today).all()
        count    = 0

        for bill in unpaid:
            bill.status = "overdue"
            self.repo.save(bill)

            from app.services.notification_service import NotificationService
            NotificationService(self.db).notify_bill_due(bill)
            count += 1

        if count:
            logger.warning(f"[MAINTENANCE] Marked {count} bill(s) as overdue")
        return count
