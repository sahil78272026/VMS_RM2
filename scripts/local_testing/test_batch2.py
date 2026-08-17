import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.services.society_service import SocietyService

db = SessionLocal()
try:
    svc = SocietyService(db)
    flats = svc.batch_create_flats(2, {
        "flat_numbers": ["1A", "1B", "2A", "2B"],
        "count": 10
    })
    print("Created:", len(flats))
    
    # check DB
    from app.models import Flat
    print("Total in DB:", db.query(Flat).filter_by(society_id=2).count())
    
finally:
    db.close()
