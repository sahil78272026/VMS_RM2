from sqlalchemy.orm import Session
"""
Visitor Log Service — core business logic of the VMS.
Handles entry, approval, exit, self check-in and overstay detection with multi-tenancy.
"""

from datetime import datetime, timedelta
import logging
logger = logging.getLogger(__name__)

from app.models import VisitorLog, Visitor
from app.repositories import (
    VisitorLogRepository, VisitorRepository,
    FlatRepository, FlatUserRepository,
    GateRepository, PreApprovalRepository,
    FrequentPassRepository, GuardRepository
)
from app.utils.exceptions import (
    NotFoundError, BlacklistedVisitorError,
    ValidationError, ForbiddenError,
    InvalidStatusTransitionError, PreApprovalExpiredError
)


# ── Stay duration to minutes map ───────────────────────────────────────────
DURATION_MINUTES = {
    "30min":    30,
    "1_2hr":    90,
    "half_day": 240,
    "full_day": 480,
    "overnight": 720,
}

# ── Entry mode to expected exit gate ──────────────────────────────────────
EXIT_GATE_BY_MODE = {
    "foot":         "entry",   # exits same gate they entered
    "two_wheeler":  "entry",
    "four_wheeler": "exit",    # exits dedicated exit gate
}


class VisitorLogService:

    def __init__(self, db: Session):
        self.db = db
        self.log_repo          = VisitorLogRepository(db)
        self.visitor_repo      = VisitorRepository(db)
        self.flat_repo         = FlatRepository(db)
        self.flat_user_repo    = FlatUserRepository(db)
        self.gate_repo         = GateRepository(db)
        self.guard_repo        = GuardRepository(db)
        self.pre_approval_repo = PreApprovalRepository(db)
        self.frequent_pass_repo = FrequentPassRepository(db)

    def _save_image(self, base64_str: str) -> str:
        if not base64_str: return None
        import os, uuid, base64, boto3
        from io import BytesIO
        from botocore.config import Config
        
        if base64_str.startswith("data:image"):
            base64_str = base64_str.split(",")[1]
            
        filename = f"{uuid.uuid4().hex}.jpg"
        image_data = base64.b64decode(base64_str)
        
        # Connect to Supabase S3
        endpoint = os.getenv('SUPABASE_S3_ENDPOINT')
        if not endpoint:
            return None

        s3 = boto3.client(
            's3',
            endpoint_url=endpoint,
            aws_access_key_id=os.getenv('SUPABASE_S3_ACCESS_KEY'),
            aws_secret_access_key=os.getenv('SUPABASE_S3_SECRET_KEY'),
            region_name=os.getenv('SUPABASE_S3_REGION', 'ap-south-1'),
            config=Config(s3={'addressing_style': 'path'})
        )
        
        bucket_name = os.getenv('SUPABASE_S3_BUCKET', 'rm2-bucket')
        file_path = f"visitors/{filename}"
        
        try:
            s3.upload_fileobj(
                BytesIO(image_data),
                bucket_name,
                file_path,
                ExtraArgs={'ContentType': 'image/jpeg'}
            )
            
            # Construct the public URL
            project_ref = endpoint.split('.')[0].replace('https://', '')
            public_url = f"https://{project_ref}.supabase.co/storage/v1/object/public/{bucket_name}/{file_path}"
            return public_url
            
        except Exception as e:
            logger.error(f"[S3_UPLOAD_ERROR] Failed to upload image: {e}")
            return None

    def _get_or_create_visitor(self, name: str, phone: str, society_id: int, photo_base64: str = None) -> Visitor:
        """Find existing visitor by phone within society or create a new one."""
        visitor = self.visitor_repo.get_by_phone(phone, society_id=society_id)
        photo_url = self._save_image(photo_base64) if photo_base64 else None
        if not visitor:
            visitor = Visitor(society_id=society_id, name=name, phone=phone, photo_url=photo_url)
            self.visitor_repo.save(visitor)
        else:
            if photo_url:
                visitor.photo_url = photo_url
                self.visitor_repo.save(visitor)
        return visitor

    def _resolve_exit_gate(self, entry_gate_id: int, entry_mode: str, society_id: int = None) -> int:
        """
        Determine expected exit gate based on entry mode within the society.
        """
        if EXIT_GATE_BY_MODE.get(entry_mode) == "exit":
            exit_gates = self.gate_repo.get_exit_gates(society_id=society_id)
            if exit_gates:
                return exit_gates[0].id
        return entry_gate_id

    def _calculate_expected_exit(self, entered_at: datetime, stay_duration: str) -> datetime:
        minutes = DURATION_MINUTES.get(stay_duration, 90)
        return entered_at + timedelta(minutes=minutes)

    def create_by_guard(self, guard_id: int, data: dict) -> VisitorLog:
        """
        Guard registers a visitor at the gate.
        Creates visitor log and notifies resident.
        """
        # Validate
        errors = {}
        if not data.get("visitor_name"):  errors["visitor_name"]  = "Required"
        if not data.get("visitor_phone"): errors["visitor_phone"] = "Required"
        if not data.get("flat_id"):       errors["flat_id"]       = "Required"
        if not data.get("entry_mode"):    errors["entry_mode"]    = "Required"
        if not data.get("stay_duration"): errors["stay_duration"] = "Required"
        if not data.get("purpose"):       errors["purpose"]       = "Required"
        if not data.get("entry_gate_id"): errors["entry_gate_id"] = "Required"
        if errors:
            raise ValidationError(errors)

        # Check flat exists
        flat = self.flat_repo.get_by_id(data["flat_id"])
        if not flat:
            raise NotFoundError("Flat")

        society_id = flat.society_id

        # Check blacklist within society
        if self.visitor_repo.is_blacklisted(data["visitor_phone"], society_id=society_id):
            visitor = self.visitor_repo.get_by_phone(data["visitor_phone"], society_id=society_id)
            raise BlacklistedVisitorError(reason=visitor.blacklist_reason)

        # Get primary resident of flat
        flat_user = self.flat_user_repo.get_primary_by_flat(data["flat_id"])
        if not flat_user:
            raise NotFoundError("Resident for this flat")

        # Get or create visitor in society
        visitor = self._get_or_create_visitor(
            data["visitor_name"], data["visitor_phone"], society_id, data.get("photo_base64")
        )

        # Resolve exit gate in society
        exit_gate_id = self._resolve_exit_gate(data["entry_gate_id"], data["entry_mode"], society_id=society_id)

        # Create log
        log = VisitorLog(
            society_id            = society_id,
            visitor_id            = visitor.id,
            flat_id               = flat.id,
            flat_user_id          = flat_user.id,
            entry_gate_id         = data["entry_gate_id"],
            entry_mode            = data["entry_mode"],
            vehicle_number        = data.get("vehicle_number"),
            registered_by_guard   = guard_id,
            approval_source       = "guard_initiated",
            approval_status       = "pending",
            purpose               = data["purpose"],
            stay_duration         = data["stay_duration"],
            expected_exit_gate_id = exit_gate_id,
            status                = "pending",
            visitor_count         = int(data.get("visitor_count", 1)),
        )

        self.log_repo.save(log)
        logger.info(f"[VISITOR_LOG] Created by guard {guard_id} — visitor: {visitor.phone} → flat: {flat.flat_number} (Society: {society_id})")

        # Notify resident
        from app.services.notification_service import NotificationService
        NotificationService(self.db).notify_approval_request(log)

        return log

    def self_checkin(self, data: dict) -> VisitorLog:
        """
        Visitor self-registers via QR code.
        No guard involved — resident notified directly.
        """
        errors = {}
        if not data.get("visitor_name"):  errors["visitor_name"]  = "Required"
        if not data.get("visitor_phone"): errors["visitor_phone"] = "Required"
        if not data.get("flat_id"):       errors["flat_id"]       = "Required"
        if not data.get("entry_mode"):    errors["entry_mode"]    = "Required"
        if not data.get("stay_duration"): errors["stay_duration"] = "Required"
        if not data.get("purpose"):       errors["purpose"]       = "Required"
        if errors:
            raise ValidationError(errors)

        flat = self.flat_repo.get_by_id(data["flat_id"])
        if not flat:
            raise NotFoundError("Flat")

        society_id = flat.society_id

        # Check blacklist in society
        if self.visitor_repo.is_blacklisted(data["visitor_phone"], society_id=society_id):
            visitor = self.visitor_repo.get_by_phone(data["visitor_phone"], society_id=society_id)
            raise BlacklistedVisitorError(reason=visitor.blacklist_reason)

        flat_user = self.flat_user_repo.get_primary_by_flat(data["flat_id"])
        if not flat_user:
            raise NotFoundError("Resident for this flat")

        visitor = self._get_or_create_visitor(
            data["visitor_name"], data["visitor_phone"], society_id, data.get("photo_base64")
        )

        # Self check-in enters from society's entry gate
        entry_gate_id = data.get("gate_id")
        if not entry_gate_id:
            entry_gates = self.gate_repo.get_entry_gates(society_id=society_id)
            if not entry_gates:
                raise NotFoundError("Entry gate for this society")
            entry_gate_id = entry_gates[0].id
        exit_gate_id  = self._resolve_exit_gate(entry_gate_id, data["entry_mode"], society_id=society_id)

        log = VisitorLog(
            society_id            = society_id,
            visitor_id            = visitor.id,
            flat_id               = flat.id,
            flat_user_id          = flat_user.id,
            entry_gate_id         = entry_gate_id,
            entry_mode            = data["entry_mode"],
            vehicle_number        = data.get("vehicle_number"),
            registered_by_guard   = None,
            approval_source       = "self_checkin",
            approval_status       = "pending",
            purpose               = data["purpose"],
            stay_duration         = data["stay_duration"],
            expected_exit_gate_id = exit_gate_id,
            status                = "pending",
            visitor_count         = int(data.get("visitor_count", 1)),
        )

        self.log_repo.save(log)
        logger.info(f"[VISITOR_LOG] Self check-in — visitor: {visitor.phone} → flat: {flat.flat_number} (Society: {society_id})")

        from app.services.notification_service import NotificationService
        NotificationService(self.db).notify_approval_request(log)

        return log

    def approve(self, log_id: int, flat_user_id: int) -> VisitorLog:
        """Resident approves a visitor entry request."""
        log = self.log_repo.get_by_id(log_id)
        if not log:
            raise NotFoundError("Visitor log")

        if log.approval_status != "pending":
            raise InvalidStatusTransitionError(log.approval_status, "approved")

        flat_user = self.flat_user_repo.get_by_id(flat_user_id)
        if not flat_user or flat_user.flat_id != log.flat_id:
            raise ForbiddenError("You can only approve visitors for your own flat")

        if flat_user.role != "primary":
            raise ForbiddenError("Only primary members can approve visitor requests")

        log.approval_status = "approved"
        log.approved_by     = flat_user_id
        log.approved_at     = datetime.utcnow()
        log.status          = "approved"

        self.log_repo.save(log)
        logger.info(f"[VISITOR_LOG] Approved log {log_id} by flat_user {flat_user_id}")

        from app.services.notification_service import NotificationService
        NotificationService(self.db).notify_guard_of_approval(log)

        return log

    def deny(self, log_id: int, flat_user_id: int) -> VisitorLog:
        """Resident denies a visitor entry request."""
        log = self.log_repo.get_by_id(log_id)
        if not log:
            raise NotFoundError("Visitor log")

        if log.approval_status != "pending":
            raise InvalidStatusTransitionError(log.approval_status, "denied")

        flat_user = self.flat_user_repo.get_by_id(flat_user_id)
        if not flat_user or flat_user.flat_id != log.flat_id:
            raise ForbiddenError("You can only manage visitors for your own flat")

        if flat_user.role != "primary":
            raise ForbiddenError("Only primary members can deny visitor requests")

        log.approval_status = "denied"
        log.approved_by     = flat_user_id
        log.approved_at     = datetime.utcnow()
        log.status          = "denied"

        self.log_repo.save(log)
        logger.info(f"[VISITOR_LOG] Denied log {log_id} by flat_user {flat_user_id}")

        return log

    def confirm_entry(self, log_id: int, guard_id: int, data: dict = None) -> VisitorLog:
        log = self.log_repo.get_by_id(log_id)
        if not log:
            raise NotFoundError("Visitor log")

        if log.approval_status != "approved":
            raise InvalidStatusTransitionError(log.approval_status, "inside")

        now = datetime.utcnow()

        log.entered_at       = now
        log.expected_exit_by = self._calculate_expected_exit(now, log.stay_duration)
        log.status           = "inside"

        if data:
            if data.get("vehicle_number"):
                log.vehicle_number = data["vehicle_number"]
            if data.get("entry_mode"):
                log.entry_mode = data["entry_mode"]
                log.expected_exit_gate_id = self._resolve_exit_gate(log.entry_gate_id, log.entry_mode, society_id=log.society_id)

        self.log_repo.save(log)
        logger.info(f"[VISITOR_LOG] Entry confirmed for log {log_id} by guard {guard_id}")

        return log

    def confirm_exit(self, log_id: int, confirmed_by: str, gate_id: int = None) -> VisitorLog:
        log = self.log_repo.get_by_id(log_id)
        if not log:
            raise NotFoundError("Visitor log")

        if log.status not in ("inside", "overdue"):
            raise InvalidStatusTransitionError(log.status, "exited")

        now = datetime.utcnow()

        log.actual_exit_at      = now
        log.actual_exit_gate_id = gate_id or log.expected_exit_gate_id
        log.exit_confirmed_by   = confirmed_by
        log.status              = "exited" if confirmed_by == "guard" else "unconfirmed_exit"

        self.log_repo.save(log)
        logger.info(f"[VISITOR_LOG] Exit confirmed for log {log_id} — by: {confirmed_by}")

        return log

    def confirm_departure_by_resident(self, log_id: int, flat_user_id: int) -> VisitorLog:
        log = self.log_repo.get_by_id(log_id)
        if not log:
            raise NotFoundError("Visitor log")

        flat_user = self.flat_user_repo.get_by_id(flat_user_id)
        if not flat_user or flat_user.flat_id != log.flat_id:
            raise ForbiddenError("You can only manage your own flat's visitors")

        return self.confirm_exit(log_id, confirmed_by="resident")

    def get_pending_for_flat(self, flat_id: int):
        return self.log_repo.get_pending_for_flat(flat_id)

    def get_inside(self, society_id: int = None):
        return self.log_repo.get_inside(society_id)

    def get_inside_for_gate(self, gate_id: int):
        return self.log_repo.get_inside_for_gate(gate_id)

    def get_overdue(self, society_id: int = None):
        return self.log_repo.get_overdue(society_id)

    def get_by_flat(self, flat_id: int, page: int = 1, per_page: int = 20):
        return self.log_repo.get_by_flat(flat_id, page, per_page)

    def get_today_for_gate(self, gate_id: int):
        return self.log_repo.get_today_for_gate(gate_id)

    def get_all_filtered(self, filters: dict, page: int = 1, per_page: int = 20, society_id: int = None):
        return self.log_repo.get_all_filtered(filters, page, per_page, society_id=society_id)

    def mark_overdue(self):
        """Background job — called every 15 minutes."""
        overdue_logs = self.log_repo.get_overdue()
        count = 0
        for log in overdue_logs:
            log.status = "overdue"
            self.log_repo.save(log)

            from app.services.notification_service import NotificationService
            NotificationService(self.db).notify_overdue(log)
            count += 1

        if count:
            logger.warning(f"[OVERSTAY] Marked {count} visitor(s) as overdue")

        return count
