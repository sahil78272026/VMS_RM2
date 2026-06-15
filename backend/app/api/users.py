from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.models import User
from app.utils.response import success, error

router = APIRouter(prefix="/api/v1/users", tags=["users"])

@router.get("")
def get_users(request: Request, role: str = None, status: str = None, db: Session = Depends(get_db)):
    """Fetch users. Usually used by Admin to find pending_verification residents."""
    try:
        q = db.query(User)
        if role:
            q = q.filter_by(role=role)
        if status:
            q = q.filter_by(status=status)
            
        users = q.all()
        return success("Users fetched", data=[u.to_dict(include_sensitive=False) for u in users])
    except Exception as e:
        return error("Failed to fetch users", "SERVER_ERROR", str(e), 500)
