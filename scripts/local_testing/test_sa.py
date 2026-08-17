import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import FlatUser

db = SessionLocal()
try:
    # Try querying with a string
    fu = db.query(FlatUser).filter_by(flat_id="1").first()
    print("Success with string!")
except Exception as e:
    print(f"Error with string: {e}")
