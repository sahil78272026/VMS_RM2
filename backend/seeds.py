"""
seeds.py — One-time database seeder for RM2 VMS.

Run once after `alembic upgrade head`:
    python seeds.py
"""

import os
import bcrypt
from dotenv import load_dotenv

load_dotenv()

from app.database import SessionLocal
from app.models import Flat, Gate, User

db = SessionLocal()

# ── RM2 Flat Numbers ───────────────────────────────────────────────────────
RM2_FLATS = []
for i in range(1, 257):
    RM2_FLATS.extend([str(i), f"{i}A", f"{i}B"])

# ── Gates ──────────────────────────────────────────────────────────────────
RM2_GATES = [
    {
        "name":   "Front Gate",
        "type":   "both",
        "status": "active",
    },
    {
        "name":   "Back Gate",
        "type":   "exit_only",
        "status": "inactive",
    },
]

# ── Default Admin ──────────────────────────────────────────────────────────
DEFAULT_ADMIN = {
    "name":     "RM2 Admin",
    "phone":    "9999999999",
    "email":    "admin@rm2society.in",
    "password": "admin",
    "role":     "admin",
    "status":   "active",
}


def seed_flats():
    print("\n── Seeding Flats ──────────────────────────────────")
    created = 0
    skipped = 0

    for flat_number in RM2_FLATS:
        exists = db.query(Flat).filter_by(flat_number=flat_number).first()
        if exists:
            print(f"  SKIP   Flat {flat_number} — already exists")
            skipped += 1
            continue

        flat = Flat(flat_number=flat_number, status="vacant")
        db.add(flat)
        print(f"  ✓      Flat {flat_number} created")
        created += 1

    db.commit()
    print(f"\n  Result: {created} created, {skipped} skipped")


def seed_gates():
    print("\n── Seeding Gates ──────────────────────────────────")
    created = 0
    skipped = 0

    for g in RM2_GATES:
        exists = db.query(Gate).filter_by(name=g["name"]).first()
        if exists:
            print(f"  SKIP   Gate '{g['name']}' — already exists")
            skipped += 1
            continue

        gate = Gate(name=g["name"], type=g["type"], status=g["status"])
        db.add(gate)
        print(f"  ✓      Gate '{g['name']}' — type: {g['type']} | status: {g['status']}")
        created += 1

    db.commit()
    print(f"\n  Result: {created} created, {skipped} skipped")


def seed_admin():
    print("\n── Seeding Admin Account ──────────────────────────")

    exists = db.query(User).filter_by(phone=DEFAULT_ADMIN["phone"]).first()
    if exists:
        print(f"  SKIP   Admin already exists — phone: {DEFAULT_ADMIN['phone']}")
        return

    password_hash = bcrypt.hashpw(
        DEFAULT_ADMIN["password"].encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    admin = User(
        name          = DEFAULT_ADMIN["name"],
        phone         = DEFAULT_ADMIN["phone"],
        email         = DEFAULT_ADMIN["email"],
        password_hash = password_hash,
        role          = DEFAULT_ADMIN["role"],
        status        = DEFAULT_ADMIN["status"],
    )
    db.add(admin)
    db.commit()

    print(f"  ✓      Admin account created")
    print(f"         Phone    : {DEFAULT_ADMIN['phone']}")
    print(f"         Email    : {DEFAULT_ADMIN['email']}")
    print(f"         Password : {DEFAULT_ADMIN['password']}")
    print(f"\n  ⚠️   Change the admin password immediately after first login!")


def run():
    print("=" * 52)
    print("  RM2 VMS — Database Seeder")
    print("=" * 52)

    seed_flats()
    seed_gates()
    seed_admin()

    print("\n" + "=" * 52)
    print("  Seeding complete ✅")
    print("=" * 52 + "\n")


if __name__ == "__main__":
    run()
