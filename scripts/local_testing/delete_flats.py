import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import Flat, User, FlatUser

def delete_flats():
    db = SessionLocal()
    try:
        # First, nullify references to flats from users to prevent foreign key errors
        db.query(User).update({"requested_flat_id": None})
        db.query(FlatUser).delete()
        
        # Now delete all flats
        deleted_count = db.query(Flat).delete()
        db.commit()
        print(f"Successfully deleted {deleted_count} flats across all societies.")
    except Exception as e:
        db.rollback()
        print("Error:", e)
    finally:
        db.close()

if __name__ == "__main__":
    delete_flats()
