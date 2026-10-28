"""Explicit setup commands; importing the API never provisions privileged accounts."""
import argparse
import getpass
from app.config import settings
from app.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.schemas.auth import RegisterRequest
from app.seeds.seed_data import seed_all


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["seed", "create-admin"])
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--email")
    args = parser.parse_args()
    if args.command == "seed":
        if args.demo and settings.APP_ENV == "production":
            parser.error("Demo accounts are forbidden in production")
        seed_all(demo=args.demo)
    else:
        email = args.email or input("Administrator email: ")
        password = getpass.getpass("Administrator password (at least 12 characters): ")
        if password != getpass.getpass("Confirm password: "):
            parser.error("Passwords do not match")
        if len(password) < 12:
            parser.error("Administrator passwords must contain at least 12 characters")
        req = RegisterRequest(name="Platform Administrator", email=email, password=password)
        with SessionLocal() as db:
            if db.query(User).filter(User.email == req.email.lower()).first():
                parser.error("Account already exists; no account was changed")
            db.add(User(name=req.name, email=req.email.lower(), password_hash=hash_password(password), role="platform_admin"))
            db.commit()
        print("Administrator created")


if __name__ == "__main__":
    main()
