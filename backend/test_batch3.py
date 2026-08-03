import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.services.society_service import SocietyService
from app.models import Society

db = SessionLocal()
service = SocietyService(db)
soc = db.query(Society).first()

try:
    flats = [f"F-{i}" for i in range(1, 553)]
    data = {"flat_numbers": flats}
    res = service.batch_create_flats(soc.id, data)
    print("SUCCESS", len(res))
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
