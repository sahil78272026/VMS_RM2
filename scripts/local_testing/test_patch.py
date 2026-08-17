from app.database import SessionLocal
from app.models import FlatUser
db = SessionLocal()
# Let's see all FlatUser entries for Sahil Garg (ID 28)
fus = db.query(FlatUser).filter(FlatUser.user_id == 28).all()
for fu in fus:
    print(f"FlatUser: ID={fu.id}, flat_id={fu.flat_id}, role={fu.role}")
