import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.services.society_service import SocietyService
from app.models import Society

db = SessionLocal()
service = SocietyService(db)
soc = db.query(Society).first()
if not soc:
    print("NO SOCIETIES EXIST")
    sys.exit(0)

try:
    data = {"flat_numbers": ["A-101", "A-102"]}
    res = service.batch_create_flats(soc.id, data)
    print("SUCCESS", res)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
