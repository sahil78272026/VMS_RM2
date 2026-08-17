import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.services.society_service import SocietyService

def generate_flats():
    db = SessionLocal()
    svc = SocietyService(db)
    
    # Generate for RM2 Residency (ID 1) - e.g. Block A and B, 5 floors, 4 flats per floor (40 flats)
    try:
        svc.batch_create_flats(1, {
            "block_names": ["A", "B"],
            "floors": 5,
            "flats_per_floor": 4
        })
        print("Generated flats for RM2 Residency (ID 1)")
    except Exception as e:
        print("Error RM2:", e)
        
    # Generate for Palm Heights (ID 2) - e.g. Tower 1 and 2, 10 floors, 5 flats per floor (100 flats)
    try:
        svc.batch_create_flats(2, {
            "block_names": ["T1", "T2"],
            "floors": 10,
            "flats_per_floor": 5
        })
        print("Generated flats for Palm Heights (ID 2)")
    except Exception as e:
        print("Error Palm Heights:", e)

if __name__ == "__main__":
    generate_flats()
