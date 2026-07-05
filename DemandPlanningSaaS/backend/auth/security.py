"""Password hashing and JWT issuance/verification.

Uses bcrypt directly for password hashing and python-jose for JWTs. The signing
key (``JWT_SECRET_KEY``) has NO default: token operations fail loudly if it is
unset, so an insecure fallback secret can never ship.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
PASSWORD_RESET_EXPIRE_MINUTES = int(os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "30"))

# bcrypt only ever consumes the first 72 bytes of the password; bcrypt >= 4.1 raises
# instead of silently truncating. We truncate explicitly to preserve classic bcrypt
# semantics (no behavioural weakening) while accepting arbitrarily long inputs.
_BCRYPT_MAX_BYTES = 72


def _get_secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError(
            "JWT_SECRET_KEY is not set. Generate one with `openssl rand -hex 32` "
            "and set it in the environment (see .env.example)."
        )
    return secret


def _to_bcrypt_bytes(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_to_bcrypt_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            _to_bcrypt_bytes(plain_password), hashed_password.encode("utf-8")
        )
    except (ValueError, TypeError):
        # Malformed/empty stored hash — treat as a failed verification, never raise.
        return False


def _create_token(claims: dict, expires_delta: timedelta, token_type: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {**claims, "type": token_type, "iat": now, "exp": now + expires_delta}
    return jwt.encode(payload, _get_secret(), algorithm=JWT_ALGORITHM)


def create_access_token(user_id: int, org_id: int, role: str) -> str:
    return _create_token(
        {"sub": str(user_id), "org_id": org_id, "role": role},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "access",
    )


def create_refresh_token(user_id: int) -> str:
    return _create_token(
        {"sub": str(user_id)},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "refresh",
    )


def create_password_reset_token(user_id: int) -> str:
    return _create_token(
        {"sub": str(user_id)},
        timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES),
        "reset",
    )


def decode_token(token: str, expected_type: Optional[str] = None) -> dict:
    """Decode and validate a JWT. Raises ``ValueError`` on any problem
    (bad signature, expired, or wrong token type)."""
    try:
        payload = jwt.decode(token, _get_secret(), algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise ValueError(f"Invalid or expired token: {exc}") from exc
    if expected_type is not None and payload.get("type") != expected_type:
        raise ValueError(
            f"Expected a '{expected_type}' token but got '{payload.get('type')}'."
        )
    return payload
