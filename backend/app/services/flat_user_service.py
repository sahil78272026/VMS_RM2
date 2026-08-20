from sqlalchemy.orm import Session
"""
Flat User Service — manages primary residents and family members.
Includes multi-tenancy scoping via society_id.
"""

import bcrypt
import logging
logger = logging.getLogger(__name__)
from app.models import User, FlatUser, Flat
from app.repositories import FlatUserRepository, FlatRepository, UserRepository
from app.utils.exceptions import (
    NotFoundError, ValidationError, DuplicateEntryError, ForbiddenError
)


class FlatUserService:
    def __init__(self, db: Session):
        self.db = db
        self.repo      = FlatUserRepository(db)
        self.flat_repo = FlatRepository(db)
        self.user_repo = UserRepository(db)

    def get_flat_members(self, user_id: int):
        """Get all members of the flat the current user belongs to."""
        flat_user = self.repo.get_by_user(user_id)
        if not flat_user:
            raise NotFoundError("Flat assignment for this user")
        return self.repo.get_all_by_flat(flat_user.flat_id)

    def add_primary(self, data: dict):
        """
        Admin assigns a primary resident to a flat.
        The user must already exist (registered via /auth/register).
        """
        user_id = data.get("user_id")
        if not user_id:
            raise ValidationError({"user_id": "Required"})

        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User")

        flat_id = data.get("flat_id") or user.requested_flat_id
        move_in = data.get("move_in_date") or user.move_in_date

        if not flat_id:
            raise ValidationError({"flat_id": "Required"})
        if not move_in:
            raise ValidationError({"move_in_date": "Required"})

        flat = self.flat_repo.get_by_id(flat_id)
        if not flat:
            raise NotFoundError("Flat")

        society_id = flat.society_id

        from datetime import date
        if isinstance(move_in, str):
            move_in = date.fromisoformat(move_in)
            
        role = user.requested_role or "primary"
        can_approve = True if role == "primary" else False

        flat_user = FlatUser(
            society_id   = society_id,
            user_id      = user_id,
            flat_id      = flat_id,
            role         = role,
            is_owner     = data.get("is_owner", False) if role == "primary" else False,
            can_approve  = can_approve,
            move_in_date = move_in,
        )
        self.repo.save(flat_user)

        # Mark flat as occupied
        flat.status = "occupied"
        self.flat_repo.save(flat)

        # Activate user account
        user.status = "active"
        self.user_repo.save(user)

        logger.info(f"[FLAT_USER] Primary resident added — user {user.id} → flat {flat.flat_number} in society {society_id}")
        return flat_user

    def add_member(self, requesting_user_id: int, data: dict):
        """
        Resident adds a family member to their flat.
        Creates a new user account for the family member.
        """
        errors = {}
        if not data.get("name"):          errors["name"]     = "Required"
        if not data.get("phone"):         errors["phone"]    = "Required"
        if not data.get("relation"):      errors["relation"] = "Required"
        if not data.get("move_in_date"):  errors["move_in_date"] = "Required"
        if errors:
            raise ValidationError(errors)

        # Get requesting user's flat
        requester = self.repo.get_by_user(requesting_user_id)
        if not requester:
            raise NotFoundError("Your flat assignment")

        # Check phone not taken
        existing_user = self.user_repo.get_by_phone(data["phone"])
        if existing_user:
            new_user = existing_user
            # If user exists but is trying to be added as a family member,
            # we should also put them into pending verification for the admin to approve
            new_user.status = "pending_verification"
            new_user.requested_flat_id = requester.flat_id
            new_user.requested_role = data["relation"]
            self.user_repo.save(new_user)
        else:
            # Create user account for family member as pending
            temp_password = data.get("password", data["phone"][-4:] + "@rm2")
            password_hash = bcrypt.hashpw(
                temp_password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            from datetime import date
            move_in = data["move_in_date"]
            if isinstance(move_in, str):
                move_in = date.fromisoformat(move_in)

            new_user = User(
                name          = data["name"].strip(),
                phone         = data["phone"].strip(),
                email         = data.get("email"),
                password_hash = password_hash,
                role          = "resident",
                status        = "pending_verification",
                requested_flat_id = requester.flat_id,
                requested_role = data["relation"],
                move_in_date  = move_in,
            )
            self.user_repo.save(new_user)

        logger.info(f"[FLAT_USER] Family member requested — {new_user.name} → flat {requester.flat_id} in society {requester.society_id}")
        return new_user

    def update_member(self, requesting_user_id: int, flat_user_id: int, data: dict):
        """Resident/Admin updates a flat member's details."""
        requester = self.repo.get_by_user(requesting_user_id)
        target    = self.repo.get_by_id(flat_user_id)

        if not target:
            raise NotFoundError("Flat member")

        # Resident can only update members in their own flat, and must be primary to update others
        if requester:
            if requester.flat_id != target.flat_id:
                raise ForbiddenError("You can only manage members of your own flat")
            if requester.id != target.id and requester.role != "primary":
                raise ForbiddenError("Only primary members can modify other members")
            if requester.id == target.id and requester.role != "primary" and (data.get("can_approve") is not None or data.get("relation") == "primary"):
                raise ForbiddenError("You cannot grant yourself primary permissions")

        if data.get("can_approve") is not None:
            target.can_approve = data["can_approve"]
        if data.get("is_owner") is not None:
            target.is_owner = data["is_owner"]
        if data.get("relation"):
            target.role = data["relation"]
        if data.get("move_out_date"):
            from datetime import date
            move_out = data["move_out_date"]
            if isinstance(move_out, str):
                move_out = date.fromisoformat(move_out)
            target.move_out_date = move_out

        self.repo.save(target)
        return target

    def remove_member(self, requesting_user_id: int, flat_user_id: int):
        """Remove a family member from the flat."""
        requester = self.repo.get_by_user(requesting_user_id)
        target    = self.repo.get_by_id(flat_user_id)

        if not target:
            raise NotFoundError("Flat member")

        if target.role == "primary":
            raise ForbiddenError("Cannot remove the primary resident via this endpoint")

        if requester:
            if requester.flat_id != target.flat_id:
                raise ForbiddenError("You can only manage members of your own flat")
            if requester.id != target.id and requester.role != "primary":
                raise ForbiddenError("Only primary members can remove other members")

        target.move_out_date = __import__('datetime').date.today()
        target.can_approve = False
        self.repo.save(target)
        logger.info(f"[FLAT_USER] Member moved out: flat_user {flat_user_id}")

    def promote_to_primary(self, requesting_user_id: int, target_flat_user_id: int):
        """
        Primary resident promotes a family member to primary.
        Only an existing primary member can do this.
        """
        requester = self.repo.get_by_user(requesting_user_id)
        if not requester:
            raise NotFoundError("Your flat assignment")
        if requester.role != "primary":
            raise ForbiddenError("Only primary members can promote others")

        target = self.repo.get_by_id(target_flat_user_id)
        if not target:
            raise NotFoundError("Flat member")
        if target.flat_id != requester.flat_id:
            raise ForbiddenError("You can only manage members of your own flat")
        if target.role == "primary":
            raise ValidationError({"role": "This member is already primary"})

        target.role = "primary"
        target.can_approve = True
        self.repo.save(target)
        logger.info(f"[FLAT_USER] Promoted flat_user {target_flat_user_id} to primary by user {requesting_user_id}")
        return target

    def demote_from_primary(self, requesting_user_id: int, target_flat_user_id: int):
        """
        Primary resident demotes another primary member back to secondary.
        Cannot demote yourself.
        """
        requester = self.repo.get_by_user(requesting_user_id)
        if not requester:
            raise NotFoundError("Your flat assignment")
        if requester.role != "primary":
            raise ForbiddenError("Only primary members can demote others")

        target = self.repo.get_by_id(target_flat_user_id)
        if not target:
            raise NotFoundError("Flat member")
        if target.flat_id != requester.flat_id:
            raise ForbiddenError("You can only manage members of your own flat")
        if target.id == requester.id:
            raise ForbiddenError("You cannot demote yourself")
        if target.role != "primary":
            raise ValidationError({"role": "This member is not primary"})

        target.role = "spouse"
        target.can_approve = False
        self.repo.save(target)
        logger.info(f"[FLAT_USER] Demoted flat_user {target_flat_user_id} from primary by user {requesting_user_id}")
        return target
