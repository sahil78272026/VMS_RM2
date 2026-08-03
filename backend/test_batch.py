import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.services.society_service import SocietyService

db = SessionLocal()
service = SocietyService(db)
try:
    data = {"flat_numbers": ["A-101", "A-102"]}
    res = service.batch_create_flats(1, data)
    print("SUCCESS", res)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
