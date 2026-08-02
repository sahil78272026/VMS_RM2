import os
import jwt
from typing import Optional, List
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, SocietyAdmin
from app.utils.security import JWT_SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_token_payload(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return payload
    except jwt.PyJWTError:
        raise credentials_exception


def get_current_user(payload: dict = Depends(get_token_payload), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = payload.get("sub")
    user = db.query(User).get(int(user_id))
    if user is None:
        raise credentials_exception
    return user


def active_account_required(user: User = Depends(get_current_user)) -> User:
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Account is inactive or pending verification")
    return user


def get_active_society_id(
    x_society_id: Optional[str] = Header(None, alias="X-Society-ID"),
    payload: dict = Depends(get_token_payload),
    user: User = Depends(active_account_required),
) -> int:
    """
    Extracts the active society_id from header (if provided) or from JWT payload claims.
    Validates that user has access or is super_admin.
    """
    if x_society_id and x_society_id.isdigit():
        society_id = int(x_society_id)
    else:
        society_id = payload.get("active_society_id") or 1

    return society_id


def require_super_admin(user: User = Depends(active_account_required)) -> User:
    if not (user.is_super_admin or user.role == "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required for this operation"
        )
    return user


def require_society_admin(
    society_id: int = Depends(get_active_society_id),
    user: User = Depends(active_account_required),
    db: Session = Depends(get_db)
) -> User:
    """
    Ensures user is a Super Admin or is an assigned Admin for the target society.
    """
    if user.is_super_admin or user.role == "super_admin":
        return user

    if user.role == "admin":
        # Check if explicitly assigned to this society
        is_assigned = db.query(SocietyAdmin).filter_by(
            society_id=society_id, user_id=user.id
        ).first() is not None
        if is_assigned:
            return user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Admin privileges required for society {society_id}"
    )


def require_roles(*allowed_roles: str):
    def role_checker(user: User = Depends(active_account_required)) -> User:
        if user.is_super_admin or user.role == "super_admin":
            return user
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' is not authorized to access this resource"
            )
        return user
    return role_checker
