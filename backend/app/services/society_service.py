from sqlalchemy.orm import Session
from datetime import datetime
import logging
logger = logging.getLogger(__name__)

from app.models import Society, SocietyAdmin, Flat, Gate, Guard, VisitorLog, User
from app.repositories import (
    SocietyRepository, SocietyAdminRepository, FlatRepository,
    GateRepository, GuardRepository, UserRepository, VisitorLogRepository
)
from app.utils.exceptions import NotFoundError, ValidationError, DuplicateEntryError


class SocietyService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = SocietyRepository(db)
        self.admin_repo = SocietyAdminRepository(db)
        self.flat_repo = FlatRepository(db)
        self.gate_repo = GateRepository(db)
        self.guard_repo = GuardRepository(db)
        self.user_repo = UserRepository(db)
        self.log_repo = VisitorLogRepository(db)

    def get_all(self, status: str = None):
        if status:
            return self.db.query(Society).filter_by(status=status).order_by(Society.name).all()
        return self.db.query(Society).order_by(Society.name).all()

    def get_by_id(self, society_id: int) -> Society:
        society = self.repo.get_by_id(society_id)
        if not society:
            raise NotFoundError("Society")
        return society

    def get_by_slug(self, slug: str) -> Society:
        society = self.repo.get_by_slug(slug)
        if not society:
            raise NotFoundError(f"Society with slug '{slug}'")
        return society

    def create(self, data: dict) -> Society:
        name = data.get("name", "").strip()
        slug = data.get("slug", "").strip().lower()

        if not name:
            raise ValidationError({"name": "Required"})
        if not slug:
            raise ValidationError({"slug": "Required"})

        if self.repo.slug_exists(slug):
            raise DuplicateEntryError(f"Society with slug '{slug}' already exists", field="slug")

        society = Society(
            name=name,
            slug=slug,
            address=data.get("address"),
            city=data.get("city"),
            total_flats=data.get("total_flats", 0),
            logo_url=data.get("logo_url"),
            status=data.get("status", "active"),
        )
        self.repo.save(society)
        logger.info(f"[SOCIETY] Created new society: {society.name} ({society.slug}) with id={society.id}")

        # Automatically create a default main gate for the new society
        default_gate = Gate(
            society_id=society.id,
            name="Main Gate",
            type="both",
            status="active"
        )
        self.gate_repo.save(default_gate)

        return society

    def update(self, society_id: int, data: dict) -> Society:
        society = self.get_by_id(society_id)

        if data.get("name"):
            society.name = data["name"].strip()
        if data.get("address") is not None:
            society.address = data["address"]
        if data.get("city") is not None:
            society.city = data["city"]
        if data.get("total_flats") is not None:
            society.total_flats = data["total_flats"]
        if data.get("logo_url") is not None:
            society.logo_url = data["logo_url"]
        if data.get("status") is not None:
            society.status = data["status"]

        self.repo.save(society)
        logger.info(f"[SOCIETY] Updated society id={society_id}")
        return society

    def get_stats(self, society_id: int) -> dict:
        society = self.get_by_id(society_id)
        flats = self.flat_repo.get_all_by_society(society_id)
        total_flats = len(flats)
        occupied_flats = sum(1 for f in flats if f.status == "occupied")
        vacant_flats = sum(1 for f in flats if f.status == "vacant")

        gates = self.gate_repo.get_all_by_society(society_id)
        guards = self.guard_repo.get_all_by_society(society_id)

        inside_logs = self.log_repo.get_inside(society_id)
        overdue_logs = self.log_repo.get_overdue(society_id)

        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_visitors_count = self.db.query(VisitorLog).filter(
            VisitorLog.society_id == society_id,
            VisitorLog.created_at >= today_start
        ).count()

        pending_approvals_count = self.db.query(VisitorLog).filter(
            VisitorLog.society_id == society_id,
            VisitorLog.approval_status == "pending"
        ).count()

        return {
            "society": society.to_dict(),
            "flats": {
                "total": total_flats,
                "occupied": occupied_flats,
                "vacant": vacant_flats,
            },
            "gates_count": len(gates),
            "guards_count": len(guards),
            "visitors": {
                "currently_inside": len(inside_logs),
                "overdue": len(overdue_logs),
                "today_total": today_visitors_count,
                "pending_approvals": pending_approvals_count,
            }
        }

    def batch_create_flats(self, society_id: int, data: dict) -> list:
        society = self.get_by_id(society_id)
        prefix = data.get("prefix", "")
        start_number = data.get("start_number", 1)
        count = data.get("count", 10)
        block_names = data.get("block_names")
        floors = data.get("floors")
        flats_per_floor = data.get("flats_per_floor")

        created_flats = []
        
        flat_numbers_list = data.get("flat_numbers")
        existing_flats_db = self.flat_repo.get_all_by_society(society_id)
        existing_flats = {f.flat_number for f in existing_flats_db}

        if flat_numbers_list and isinstance(flat_numbers_list, list):
            unique_flats = []
            seen = set()
            for f in flat_numbers_list:
                f_clean = str(f).strip()
                if f_clean not in seen and f_clean not in existing_flats:
                    unique_flats.append(f_clean)
                    seen.add(f_clean)

            from sqlalchemy.exc import IntegrityError
            for num_str in unique_flats:
                flat = Flat(
                    society_id=society_id,
                    flat_number=num_str,
                    status="vacant"
                )
                created_flats.append(flat)

        elif block_names and floors and flats_per_floor:
            from sqlalchemy.exc import IntegrityError
            # Generate e.g. A-101, A-102, B-101, ...
            for block in block_names:
                for floor in range(1, floors + 1):
                    for unit in range(1, flats_per_floor + 1):
                        num_str = f"{block}-{floor}{unit:02d}"
                        if num_str not in existing_flats:
                            flat = Flat(
                                society_id=society_id,
                                flat_number=num_str,
                                status="vacant"
                            )
                            created_flats.append(flat)
                            existing_flats.add(num_str)
        else:
            from sqlalchemy.exc import IntegrityError
            # Sequential e.g. 101, 102, 103...
            for i in range(count):
                num_str = f"{prefix}{start_number + i}"
                if num_str not in existing_flats:
                    flat = Flat(
                        society_id=society_id,
                        flat_number=num_str,
                        status="vacant"
                    )
                    created_flats.append(flat)
                    existing_flats.add(num_str)

        if created_flats:
            self.db.add_all(created_flats)
            try:
                self.db.commit()
            except Exception as e:
                self.db.rollback()
                pass

        # Update society total_flats
        all_flats_count = self.db.query(Flat).filter_by(society_id=society_id).count()
        society.total_flats = all_flats_count
        self.repo.save(society)

        logger.info(f"[SOCIETY] Created {len(created_flats)} flats for society id={society_id}")
        return [f.to_dict() for f in created_flats]

    def assign_admin(self, society_id: int, user_id: int = None, data: dict = None) -> SocietyAdmin:
        society = self.get_by_id(society_id)
        
        user = None
        if user_id:
            user = self.user_repo.get_by_id(user_id)
            if not user:
                raise NotFoundError("User")
        elif data and data.get("phone"):
            phone = data["phone"].strip()
            user = self.user_repo.get_by_phone(phone)
            if not user:
                import bcrypt, secrets
                name = (data.get("name") or "Society Admin").strip()
                raw_email = data.get("email")
                email = raw_email.strip() if isinstance(raw_email, str) and raw_email.strip() else None
                random_pw = secrets.token_urlsafe(16)
                pw_hash = bcrypt.hashpw(random_pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                user = User(
                    name=name,
                    phone=phone,
                    email=email,
                    password_hash=pw_hash,
                    role="admin",
                    status="active"
                )
                self.user_repo.save(user)
                logger.info(f"[SOCIETY] Created new admin user: {user.phone} ({user.name})")
            else:
                if user.role != "admin" and not user.is_super_admin:
                    user.role = "admin"
                user.status = "active"
                self.user_repo.save(user)
        else:
            raise ValidationError({"admin": "user_id or phone is required"})

        if self.admin_repo.is_admin(society_id, user.id):
            raise DuplicateEntryError("User is already an admin of this society")

        sa = SocietyAdmin(society_id=society_id, user_id=user.id)
        self.admin_repo.save(sa)
        logger.info(f"[SOCIETY] Assigned user {user.id} ({user.phone}) as admin of society {society_id}")

        # Optional: Assign to a flat if flat_id is provided
        flat_id = data.get("flat_id") if data else None
        if flat_id:
            from app.models import FlatUser, Flat
            from datetime import date
            flat = self.db.query(Flat).filter_by(id=flat_id, society_id=society_id).first()
            if flat:
                existing_fu = self.db.query(FlatUser).filter_by(user_id=user.id, flat_id=flat_id).first()
                if not existing_fu:
                    fu = FlatUser(
                        society_id=society_id,
                        user_id=user.id,
                        flat_id=flat_id,
                        role="primary",
                        is_owner=True,
                        can_approve=True,
                        move_in_date=date.today()
                    )
                    self.db.add(fu)
                    flat.status = "occupied"
                    self.db.commit()
                    logger.info(f"[SOCIETY] Also assigned admin {user.id} to flat {flat.flat_number} as resident")

        return sa

    def remove_admin(self, society_id: int, user_id: int):
        sa = self.admin_repo.get_by_society_and_user(society_id, user_id)
        if not sa:
            raise NotFoundError("Society admin assignment")
        self.admin_repo.delete(sa)
        logger.info(f"[SOCIETY] Removed user {user_id} as admin from society {society_id}")

    def get_society_admins(self, society_id: int):
        self.get_by_id(society_id)
        return self.admin_repo.get_admins_by_society(society_id)

    def suspend(self, society_id: int) -> Society:
        society = self.get_by_id(society_id)
        society.status = "suspended"
        self.repo.save(society)
        logger.warning(f"[SOCIETY] Suspended society {society_id} ({society.name})")
        return society

    def activate(self, society_id: int) -> Society:
        society = self.get_by_id(society_id)
        society.status = "active"
        self.repo.save(society)
        logger.info(f"[SOCIETY] Activated society {society_id} ({society.name})")
        return society

    def delete(self, society_id: int):
        society = self.get_by_id(society_id)
        # Because we have CASCADE delete set up in SQLAlchemy models (or DB level),
        # deleting this society will wipe flats, gates, visitor logs, etc.
        self.repo.delete(society)
        logger.critical(f"[SOCIETY] PERMANENTLY DELETED society {society_id} ({society.name}) and all associated data.")

