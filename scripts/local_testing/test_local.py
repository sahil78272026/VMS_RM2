import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.services.society_service import SocietyService

db = SessionLocal()
try:
    svc = SocietyService(db)
    flats = svc.batch_create_flats(2, {
        "flat_numbers": ["1A", "1B", "1C", "2A", "2B", "2C"],
        "count": 10
    })
    print(f"Created {len(flats)} flats")
    db.rollback()
finally:
    db.close()
