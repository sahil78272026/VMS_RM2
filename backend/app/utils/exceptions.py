"""
Custom exceptions for RM2 VMS.

Using custom exceptions keeps business logic clean —
services raise exceptions, routes catch them and return
the correct HTTP response. No try/except nesting everywhere.
"""


class AppException(Exception):
    """Base exception for all application errors."""
    def __init__(self, message: str, code: str, status_code: int = 400, details=None):
        self.message     = message
        self.code        = code
        self.status_code = status_code
        self.details     = details
        super().__init__(message)


# ── Auth Exceptions ────────────────────────────────────────────────────────

class InvalidCredentialsError(AppException):
    def __init__(self):
        super().__init__("Invalid phone or password", "INVALID_CREDENTIALS", 401)

class AccountInactiveError(AppException):
    def __init__(self):
        super().__init__("Account is inactive or pending verification", "ACCOUNT_INACTIVE", 403)

class TokenExpiredError(AppException):
    def __init__(self):
        super().__init__("Token has expired", "EXPIRED_TOKEN", 401)

class InvalidTokenError(AppException):
    def __init__(self):
        super().__init__("Invalid or malformed token", "INVALID_TOKEN", 401)


# ── Resource Exceptions ────────────────────────────────────────────────────

class NotFoundError(AppException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(f"{resource} not found", "NOT_FOUND", 404)

class DuplicateEntryError(AppException):
    def __init__(self, message: str, field: str = None):
        super().__init__(message, "DUPLICATE_ENTRY", 409, details={"field": field} if field else None)

class ForbiddenError(AppException):
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, "FORBIDDEN", 403)

class ValidationError(AppException):
    def __init__(self, details):
        super().__init__("Validation failed", "VALIDATION_ERROR", 400, details=details)

class ConflictError(AppException):
    def __init__(self, message: str, details: str = None):
        super().__init__(message, "CONFLICT", 409, details=details)


# ── Business Logic Exceptions ──────────────────────────────────────────────

class BlacklistedVisitorError(AppException):
    def __init__(self, reason: str = None):
        super().__init__(
            "Visitor is blacklisted and cannot enter",
            "BLACKLISTED",
            403,
            details={"reason": reason} if reason else None
        )

class InvalidStatusTransitionError(AppException):
    def __init__(self, from_status: str, to_status: str):
        super().__init__(
            f"Cannot transition from {from_status} to {to_status}",
            "INVALID_STATUS_TRANSITION",
            422,
            details={"from": from_status, "to": to_status}
        )

class PreApprovalExpiredError(AppException):
    def __init__(self):
        super().__init__("Pre-approval has expired or is no longer valid", "PRE_APPROVAL_EXPIRED", 422)

class FrequentPassInvalidError(AppException):
    def __init__(self, reason: str):
        super().__init__(
            "Frequent pass is not valid",
            "FREQUENT_PASS_INVALID",
            422,
            details=reason
        )

class ShiftNotActiveError(AppException):
    def __init__(self):
        super().__init__("No active shift found. Please start your shift first.", "SHIFT_NOT_ACTIVE", 403)

class PanicAlreadyActiveError(AppException):
    def __init__(self):
        super().__init__("A panic alert is already active", "PANIC_ALREADY_ACTIVE", 409)
