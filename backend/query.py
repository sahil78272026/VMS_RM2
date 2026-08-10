from app.database import SessionLocal
from app.models import GateSession
db = SessionLocal()
sessions = db.query(GateSession).order_by(GateSession.id.desc()).limit(5).all()
for s in sessions:
    print(f"ID: {s.id}, Guard: {s.guard_id}, GuardName: {s.guard_name}, Gate: {s.gate_id}, Start: {s.shift_start}")
