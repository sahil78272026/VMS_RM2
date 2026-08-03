from app.database import SessionLocal
from app.models import Guard, GateSession, Gate
from app.services.gate_session_service import GateSessionService

db = SessionLocal()
guard = db.query(Guard).first()
gate = db.query(Gate).first()

if guard and gate:
    try:
        service = GateSessionService(db)
        session = service.start_shift(guard.id, gate.id)
        print("Success:", session.to_dict())
    except Exception as e:
        print("Error:", repr(e))
else:
    print("Guard or Gate not found")

db.close()
