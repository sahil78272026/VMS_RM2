import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import Society, Flat

def sync_totals():
    db = SessionLocal()
    try:
        societies = db.query(Society).all()
        for soc in societies:
            count = db.query(Flat).filter_by(society_id=soc.id).count()
            soc.total_flats = count
            print(f"Set '{soc.name}' total_flats to {count}")
        db.commit()
    except Exception as e:
        db.rollback()
        print("Error:", e)
    finally:
        db.close()

if __name__ == "__main__":
    sync_totals()
