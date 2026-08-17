import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import Flat, Society

def check_flats():
    db = SessionLocal()
    societies = db.query(Society).all()
    for soc in societies:
        flats = db.query(Flat).filter_by(society_id=soc.id).all()
        print(f"Society '{soc.name}' (ID {soc.id}) has {len(flats)} flats.")

if __name__ == "__main__":
    check_flats()
