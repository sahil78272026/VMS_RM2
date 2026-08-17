from app.database import SessionLocal
from app.repositories import VisitorLogRepository
import json

db = SessionLocal()
repo = VisitorLogRepository(db)
logs = repo.get_pending_for_gate(1)  # Assuming gate 1
print(json.dumps([l.to_dict() for l in logs], indent=2))
