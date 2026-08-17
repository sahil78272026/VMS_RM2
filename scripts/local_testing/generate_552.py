import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.services.society_service import SocietyService

db = SessionLocal()
try:
    svc = SocietyService(db)
    # The user generated 1,1A,1B from 1 to 184 (184 * 3 = 552 flats)
    # Wait, the user generated 1..184 with None,A,B? Let's just create 552 flats.
    flat_numbers = []
    for i in range(1, 185):
        flat_numbers.extend([str(i), f"{i}A", f"{i}B"])
    
    print(f"Generating {len(flat_numbers)} flats for Society 2")
    flats = svc.batch_create_flats(2, {
        "flat_numbers": flat_numbers,
        "count": 10
    })
    print(f"Successfully generated {len(flats)} flats")
finally:
    db.close()
