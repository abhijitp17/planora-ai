"""Authentication API: /api/auth/*.

Login issues a JWT access+refresh pair; refresh rotates them; /me and /logout are
authenticated. Repeated failed logins lock the account for a cooldown window.
"""

import logging
import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import auth.models as auth_models
from auth.dependencies import get_current_user
from auth.schemas import (
    LoginRequest,
    MessageResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    TokenPair,
    UserOut,
)
from auth.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

MAX_FAILED_LOGIN_ATTEMPTS = int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS", "5"))
LOCKOUT_MINUTES = int(os.getenv("LOCKOUT_MINUTES", "15"))


def _issue_token_pair(user: auth_models.User) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user.id, user.organization_id, user.role),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/login", response_model=TokenPair)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenPair:
    user = (
        db.query(auth_models.User)
        .filter(auth_models.User.email == body.email.lower())
        .first()
    )
    now = datetime.utcnow()

    # Reject while locked, without revealing whether credentials were correct.
    if user is not None and user.locked_until is not None and user.locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account temporarily locked due to repeated failed logins.",
        )

    if user is None or not verify_password(body.password, user.hashed_password):
        # Count the failure and lock the account once the threshold is crossed.
        if user is not None:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
                user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
                logger.warning(
                    "Account locked after repeated failed logins",
                    extra={"user_id": user.id, "action": "account_locked"},
                )
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive."
        )

    # Success — clear any failure state and record the login.
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    db.commit()
    logger.info("User logged in", extra={"user_id": user.id, "action": "login"})
    return _issue_token_pair(user)


@router.post("/refresh", response_model=TokenPair)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)) -> TokenPair:
    try:
        payload = decode_token(body.refresh_token, expected_type="refresh")
        user_id = int(payload["sub"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token."
        )

    user = (
        db.query(auth_models.User).filter(auth_models.User.id == user_id).first()
    )
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token."
        )
    # Rotate both tokens on every refresh.
    return _issue_token_pair(user)


@router.get("/me", response_model=UserOut)
def me(user: auth_models.User = Depends(get_current_user)) -> auth_models.User:
    return user


@router.post("/logout", response_model=MessageResponse)
def logout(user: auth_models.User = Depends(get_current_user)) -> MessageResponse:
    # JWTs are stateless: the client discards its tokens. Server-side revocation
    # (a token blocklist) is a documented Phase 2 hardening item.
    logger.info("User logged out", extra={"user_id": user.id, "action": "logout"})
    return MessageResponse(message="Logged out.")


def _deliver_password_reset_token(user: auth_models.User, token: str) -> None:
    """Deliver a password-reset token to the user.

    Email transport is not part of Phase 0 (no notification infrastructure yet).
    Until it is wired up, the token is logged server-side so an operator can deliver
    it manually. This is the single seam to replace with a real email sender later.
    """
    logger.info(
        "Password reset requested; token logged pending email transport",
        extra={"user_id": user.id, "action": "password_reset_request"},
    )
    logger.info("Password reset token for %s: %s", user.email, token)


@router.post("/password-reset/request", response_model=MessageResponse)
def password_reset_request(
    body: PasswordResetRequest, db: Session = Depends(get_db)
) -> MessageResponse:
    user = (
        db.query(auth_models.User)
        .filter(auth_models.User.email == body.email.lower())
        .first()
    )
    if user is not None:
        _deliver_password_reset_token(user, create_password_reset_token(user.id))
    # Always return the same response so the endpoint can't be used to enumerate accounts.
    return MessageResponse(
        message="If that account exists, a password reset link has been sent."
    )


@router.post("/password-reset/confirm", response_model=MessageResponse)
def password_reset_confirm(
    body: PasswordResetConfirm, db: Session = Depends(get_db)
) -> MessageResponse:
    try:
        payload = decode_token(body.token, expected_type="reset")
        user_id = int(payload["sub"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    user = db.query(auth_models.User).filter(auth_models.User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    user.hashed_password = hash_password(body.new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    logger.info(
        "Password reset completed", extra={"user_id": user.id, "action": "password_reset"}
    )
    return MessageResponse(message="Password updated. You can now log in.")
