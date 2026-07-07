"""Bootstrap the default organization and an initial admin user.

Idempotent: safe to run repeatedly. The default organization (id=1) is normally
created by migration 0002; this script ensures it exists and creates a first admin
so the platform is loginable on a fresh install.

Usage (from the backend/ directory, with the venv/deps and JWT_SECRET_KEY set):

    python -m scripts.seed_default_org \
        --email admin@planora.ai --password 'change-me-now' --name 'Admin User'

Environment variables SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME are
used as defaults when the corresponding flag is omitted.
"""

import argparse
import os
import sys

# Allow running as `python -m scripts.seed_default_org` OR `python scripts/seed_default_org.py`.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import SessionLocal  # noqa: E402
import auth.models as auth_models  # noqa: E402
from auth.security import hash_password  # noqa: E402

DEFAULT_ORG_ID = 1
DEFAULT_ORG_NAME = "Default Organization"
DEFAULT_ORG_SLUG = "default"


def seed(email: str, password: str, name: str) -> None:
    db = SessionLocal()
    try:
        # 1. Ensure the default organization exists (migration 0002 usually creates it).
        org = (
            db.query(auth_models.Organization)
            .filter(auth_models.Organization.id == DEFAULT_ORG_ID)
            .first()
        )
        if org is None:
            org = auth_models.Organization(
                id=DEFAULT_ORG_ID, name=DEFAULT_ORG_NAME, slug=DEFAULT_ORG_SLUG
            )
            db.add(org)
            db.commit()
            print(f"Created default organization (id={DEFAULT_ORG_ID}).")
        else:
            print(f"Default organization already exists (id={DEFAULT_ORG_ID}).")

        # 2. Ensure the admin user exists.
        existing = (
            db.query(auth_models.User)
            .filter(auth_models.User.email == email.lower())
            .first()
        )
        if existing is not None:
            print(f"User {email} already exists — leaving it unchanged.")
            return

        user = auth_models.User(
            organization_id=DEFAULT_ORG_ID,
            email=email.lower(),
            hashed_password=hash_password(password),
            name=name,
            role="admin",
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"Created admin user {email} in organization {DEFAULT_ORG_ID}.")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed default org + admin user.")
    parser.add_argument("--email", default=os.getenv("SEED_ADMIN_EMAIL", "admin@planora.ai"))
    parser.add_argument("--password", default=os.getenv("SEED_ADMIN_PASSWORD"))
    parser.add_argument("--name", default=os.getenv("SEED_ADMIN_NAME", "Admin User"))
    args = parser.parse_args()

    if not args.password:
        parser.error(
            "A password is required: pass --password or set SEED_ADMIN_PASSWORD "
            "(no insecure default is provided)."
        )

    seed(args.email, args.password, args.name)


if __name__ == "__main__":
    main()
