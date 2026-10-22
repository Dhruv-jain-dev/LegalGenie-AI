"""Interactively add or reset a password hash for one legacy LegalGenie user."""
from __future__ import annotations

import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database.mongodb import MongoRepository, hash_password, utcnow


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("email", help="Existing LegalGenie user email")
    parser.add_argument("--replace", action="store_true", help="Allow replacing an existing password hash")
    args = parser.parse_args()
    password = getpass.getpass("New password (minimum 8 characters): ")
    confirm = getpass.getpass("Confirm new password: ")
    if len(password) < 8:
        parser.error("Password must be at least 8 characters.")
    if password != confirm:
        parser.error("Passwords do not match.")

    repository = MongoRepository()
    user = repository.get_user_by_email(args.email)
    if not user:
        parser.error("No user exists for that email.")
    if user.get("password_hash") and not args.replace:
        parser.error("This user already has a password hash. Re-run with --replace only when resetting it.")
    repository.db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(password), "updated_at": utcnow()}},
    )
    print("Password hash updated. The password was not displayed or stored in command history.")


if __name__ == "__main__":
    main()
