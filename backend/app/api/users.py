from typing import Optional
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, FlatUser, Flat, Guard, SocietyAdmin
from app.utils.response import success, error
from app.api.deps import get_current_user
from app.utils.security import JWT_SECRET_KEY, ALGORITHM
import jwt

router = APIRouter(prefix="/api/v1/users", tags=["users"])

@router.get("")
def get_users(
    request: Request,
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    society_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Fetch users filtered by role, status, and society."""
    try:
        header_society_id = request.headers.get("X-Society-ID")
        target_society_id = society_id or (int(header_society_id) if header_society_id and header_society_id.isdigit() else None)
        
        if not target_society_id:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                try:
                    raw_token = auth_header.split(" ")[1]
                    payload = jwt.decode(raw_token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
                    target_society_id = payload.get("active_society_id")
                except Exception:
                    pass

        q = db.query(User)
        if role:
            q = q.filter(User.role == role)
        if status:
            q = q.filter(User.status == status)

        if target_society_id:
            if role == "resident":
                # For pending verification, admins should only see flats with NO active primary resident
                if status == "pending_verification":
                    flats_with_primary = db.query(FlatUser.flat_id).join(User, FlatUser.user_id == User.id).filter(
                        FlatUser.society_id == target_society_id,
                        FlatUser.role == "primary",
                        User.status == "active"
                    ).subquery()
                    q = q.filter(User.requested_flat_id.notin_(flats_with_primary))
                
                flat_ids_in_soc = db.query(Flat.id).filter(Flat.society_id == target_society_id)
                flat_user_ids = db.query(FlatUser.user_id).filter(FlatUser.society_id == target_society_id)
                q = q.filter(
                    (User.id.in_(flat_user_ids)) | (User.requested_flat_id.in_(flat_ids_in_soc))
                )
            elif role == "guard":
                guard_user_ids = db.query(Guard.user_id).filter(Guard.society_id == target_society_id)
                q = q.filter(User.id.in_(guard_user_ids))
            elif role == "admin":
                admin_user_ids = db.query(SocietyAdmin.user_id).filter(SocietyAdmin.society_id == target_society_id)
                q = q.filter(User.id.in_(admin_user_ids))

        users = q.all()
        return success("Users fetched", data=[u.to_dict(include_sensitive=False) for u in users])
    except Exception as e:
        return error("Failed to fetch users", "SERVER_ERROR", str(e), 500)

@router.patch("/me/notifications")
async def toggle_notifications(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Toggle mute/unmute notifications for the current user."""
    try:
        data = await request.json()
        mute = data.get("muted", False)
        current_user.notifications_muted = mute
        db.commit()
        return success("Notification settings updated", data={"notifications_muted": current_user.notifications_muted})
    except Exception as e:
        return error("Failed to update notification settings", "SERVER_ERROR", str(e), 500)

@router.patch("/me/force-entry")
async def toggle_force_entry(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Toggle allow guard force entry for the current user."""
    try:
        data = await request.json()
        allow = data.get("allow_guard_force_entry", False)
        current_user.allow_guard_force_entry = allow
        db.commit()
        return success("Force entry settings updated", data={"allow_guard_force_entry": current_user.allow_guard_force_entry})
    except Exception as e:
        return error("Failed to update force entry settings", "SERVER_ERROR", str(e), 500)
