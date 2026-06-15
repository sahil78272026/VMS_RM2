"""
Decorators for route-level access control and guards.
Used on every protected endpoint to enforce RBAC cleanly.
"""

from functools import wraps
import logging
logger = logging.getLogger(__name__)

from app.utils.response import forbidden, unauthorized
from app.utils.exceptions import ForbiddenError, AccountInactiveError


def roles_required(*roles):
    """
    Restrict endpoint to specific roles.

    Usage:
        @roles_required("admin")
        @roles_required("guard", "admin")
        @roles_required("resident", "guard", "admin")
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role")

            if user_role not in roles:
                return forbidden(f"Role '{user_role}' is not allowed to access this resource")

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def active_account_required(fn):
    """
    Ensure the account is active before allowing access.
    Blocks pending_verification and inactive accounts.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        status = claims.get("status")

        if status != "active":
            return forbidden("Account is inactive or pending verification")

        return fn(*args, **kwargs)
    return wrapper


def self_or_admin(fn):
    """
    Allow access if the requesting user is the resource owner OR an admin.
    The route must have a `user_id` parameter.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims      = get_jwt()
        current_id  = get_jwt_identity()
        role        = claims.get("role")
        target_id   = kwargs.get("user_id")

        if role != "admin" and str(current_id) != str(target_id):
            return forbidden("You can only access your own resources")

        return fn(*args, **kwargs)
    return wrapper


def log_request(fn):
    """
    Log every incoming request with method, path and user identity.
    Useful for audit trails on sensitive endpoints.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        import logging
logger = logging.getLogger(__name__)
        try:
            identity = get_jwt_identity()
        except Exception:
            identity = "anonymous"

        logger.info(
            f"[REQUEST] {request.method} {request.path} — user: {identity}"
        )
        return fn(*args, **kwargs)
    return wrapper
