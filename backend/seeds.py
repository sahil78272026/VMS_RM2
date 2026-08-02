"""
seeds.py — Multi-tenant database seeder for RM2 Secure SaaS.

Run once after `alembic upgrade head`:
    python seeds.py
"""

import os
import bcrypt
from dotenv import load_dotenv

load_dotenv()

from app.database import SessionLocal
from app.models import Society, SocietyAdmin, Flat, Gate, User

db = SessionLocal()

# ── Societies ──────────────────────────────────────────────────────────────
SOCIETIES = [
    {
        "id": 1,
        "name": "RM2 Residency",
        "slug": "rm2-residency",
        "address": "Main Street, Sector 1",
        "city": "New Delhi",
        "total_flats": 256,
        "status": "active"
    },
    {
        "id": 2,
        "name": "Palm Heights",
        "slug": "palm-heights",
        "address": "Golf Course Road, Sector 54",
        "city": "Gurugram",
        "total_flats": 50,
        "status": "active"
    }
]

# ── RM2 Flat Numbers ───────────────────────────────────────────────────────
RM2_FLATS = []
for i in range(1, 257):
    RM2_FLATS.extend([str(i), f"{i}A", f"{i}B"])

# ── Gates ──────────────────────────────────────────────────────────────────
RM2_GATES = [
    {
        "society_id": 1,
        "name":   "Front Gate",
        "type":   "both",
        "status": "active",
    },
    {
        "society_id": 1,
        "name":   "Back Gate",
        "type":   "exit_only",
        "status": "inactive",
    },
    {
        "society_id": 2,
        "name":   "Tower A Main Gate",
        "type":   "both",
        "status": "active",
    }
]

# ── Default Users ──────────────────────────────────────────────────────────
SUPER_ADMIN = {
    "name":           "RM2 Super Admin",
    "phone":          "0000000000",
    "email":          "superadmin@rm2society.in",
    "password":       "superadmin",
    "role":           "super_admin",
    "is_super_admin": True,
    "status":         "active",
}

SOCIETY_ADMIN = {
    "name":           "RM2 Admin",
    "phone":          "9999999999",
    "email":          "admin@rm2society.in",
    "password":       "admin",
    "role":           "admin",
    "is_super_admin": False,
    "status":         "active",
}


def seed_societies():
    print("\n── Seeding Societies ──────────────────────────────")
    for s in SOCIETIES:
        exists = db.query(Society).filter_by(slug=s["slug"]).first()
        if exists:
            print(f"  SKIP   Society '{s['name']}' ({s['slug']}) — already exists")
            continue
        society = Society(
            id=s["id"],
            name=s["name"],
            slug=s["slug"],
            address=s["address"],
            city=s["city"],
            total_flats=s["total_flats"],
            status=s["status"]
        )
        db.add(society)
        print(f"  ✓      Society '{s['name']}' created (id={s['id']})")
    db.commit()


def seed_flats():
    print("\n── Seeding Flats for RM2 Residency (Society ID: 1) ──")
    created = 0
    skipped = 0

    for flat_number in RM2_FLATS:
        exists = db.query(Flat).filter_by(society_id=1, flat_number=flat_number).first()
        if exists:
            skipped += 1
            continue

        flat = Flat(society_id=1, flat_number=flat_number, status="vacant")
        db.add(flat)
        created += 1

    db.commit()
    print(f"  Result for RM2 Residency: {created} created, {skipped} skipped")

    # Seed some sample flats for Palm Heights (Society ID: 2)
    print("\n── Seeding Flats for Palm Heights (Society ID: 2) ──")
    palm_created = 0
    for block in ["A", "B"]:
        for floor in range(1, 6):
            for unit in range(1, 5):
                f_num = f"{block}-{floor}0{unit}"
                exists = db.query(Flat).filter_by(society_id=2, flat_number=f_num).first()
                if not exists:
                    flat = Flat(society_id=2, flat_number=f_num, status="vacant")
                    db.add(flat)
                    palm_created += 1
    db.commit()
    print(f"  Result for Palm Heights: {palm_created} created")


def seed_gates():
    print("\n── Seeding Gates ──────────────────────────────────")
    created = 0
    skipped = 0

    for g in RM2_GATES:
        exists = db.query(Gate).filter_by(society_id=g["society_id"], name=g["name"]).first()
        if exists:
            print(f"  SKIP   Gate '{g['name']}' (Society {g['society_id']}) — already exists")
            skipped += 1
            continue

        gate = Gate(
            society_id=g["society_id"],
            name=g["name"],
            type=g["type"],
            status=g["status"]
        )
        db.add(gate)
        print(f"  ✓      Gate '{g['name']}' (Society {g['society_id']}) created")
        created += 1

    db.commit()
    print(f"  Result: {created} created, {skipped} skipped")


def seed_users():
    print("\n── Seeding Admin Accounts ─────────────────────────")

    # 1. Super Admin
    super_exists = db.query(User).filter_by(phone=SUPER_ADMIN["phone"]).first()
    if not super_exists:
        pw_hash = bcrypt.hashpw(
            SUPER_ADMIN["password"].encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")
        s_admin = User(
            name=SUPER_ADMIN["name"],
            phone=SUPER_ADMIN["phone"],
            email=SUPER_ADMIN["email"],
            password_hash=pw_hash,
            role=SUPER_ADMIN["role"],
            is_super_admin=SUPER_ADMIN["is_super_admin"],
            status=SUPER_ADMIN["status"],
        )
        db.add(s_admin)
        db.commit()
        print(f"  ✓      Super Admin created: {SUPER_ADMIN['email']} (Password: {SUPER_ADMIN['password']})")
    else:
        print(f"  SKIP   Super Admin already exists")

    # 2. RM2 Society Admin
    admin_exists = db.query(User).filter_by(phone=SOCIETY_ADMIN["phone"]).first()
    if not admin_exists:
        pw_hash = bcrypt.hashpw(
            SOCIETY_ADMIN["password"].encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")
        admin = User(
            name=SOCIETY_ADMIN["name"],
            phone=SOCIETY_ADMIN["phone"],
            email=SOCIETY_ADMIN["email"],
            password_hash=pw_hash,
            role=SOCIETY_ADMIN["role"],
            is_super_admin=SOCIETY_ADMIN["is_super_admin"],
            status=SOCIETY_ADMIN["status"],
        )
        db.add(admin)
        db.commit()
        print(f"  ✓      Society Admin created: {SOCIETY_ADMIN['email']} (Password: {SOCIETY_ADMIN['password']})")
    else:
        admin = admin_exists
        print(f"  SKIP   Society Admin already exists")

    # Link RM2 Admin to Society 1
    sa_link = db.query(SocietyAdmin).filter_by(society_id=1, user_id=admin.id).first()
    if not sa_link:
        sa_link = SocietyAdmin(society_id=1, user_id=admin.id)
        db.add(sa_link)
from sqlalchemy import text

def sync_sequences():
    print("\n── Synchronizing DB Primary Key Sequences ──────────")
    tables = ["societies", "flats", "gates", "users", "society_admins", "visitor_logs", "maintenance_records", "announcements", "pre_approvals", "frequent_passes"]
    for t in tables:
        try:
            db.execute(text(f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), coalesce(max(id), 1)) FROM {t};"))
            db.commit()
            print(f"  ✓      Synced sequence for '{t}'")
        except Exception as e:
            db.rollback()


def run():
    print("=" * 56)
    print("  RM2 Secure — Multi-Tenant Database Seeder")
    print("=" * 56)

    seed_societies()
    seed_flats()
    seed_gates()
    seed_users()
    sync_sequences()

    print("\n" + "=" * 56)
    print("  Multi-Tenant Seeding complete ✅")
    print("=" * 56 + "\n")


if __name__ == "__main__":
    run()
