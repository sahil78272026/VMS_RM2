from app.database import SessionLocal
from app.models import VisitorLog
import json

db = SessionLocal()
logs = db.query(VisitorLog).filter(VisitorLog.status == 'pending').all()
print(json.dumps([l.to_dict() for l in logs], indent=2))
