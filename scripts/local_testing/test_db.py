import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models import Society

db = SessionLocal()
societies = db.query(Society).all()
print(f"Total societies in DB: {len(societies)}")
for s in societies:
    print(f" - {s.id}: {s.name} ({s.status})")
db.close()
