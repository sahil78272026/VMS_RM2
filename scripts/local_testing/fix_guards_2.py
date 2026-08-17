from app.database import SessionLocal
from app.models import Society, User, Guard
import bcrypt

db = SessionLocal()

def create_or_get_guard_user(name: str, phone: str, pin: str):
    u = db.query(User).filter(User.phone == phone).first()
    if not u:
        u = User(
            name=name,
            phone=phone,
            role="guard",
            password_hash=bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        )
        db.add(u)
        db.commit()
        db.refresh(u)
    return u

society = db.query(Society).filter_by(id=7).first()
if society:
    u1 = create_or_get_guard_user("Main Gate", f"11111{society.id:05d}", "1111")
    g1 = db.query(Guard).filter_by(society_id=society.id, employee_id=f"G-{society.id}-1").first()
    if not g1:
        g1 = Guard(
            society_id=society.id,
            user_id=u1.id,
            employee_id=f"G-{society.id}-1",
            shift="morning",
            shift_pin_hash=bcrypt.hashpw("1111".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        )
        db.add(g1)
        print("Created g1")
    
    u2 = create_or_get_guard_user("Guard 1", f"22222{society.id:05d}", "2222")
    g2 = db.query(Guard).filter_by(society_id=society.id, employee_id=f"G-{society.id}-2").first()
    if not g2:
        g2 = Guard(
            society_id=society.id,
            user_id=u2.id,
            employee_id=f"G-{society.id}-2",
            shift="night",
            shift_pin_hash=bcrypt.hashpw("2222".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        )
        db.add(g2)
        print("Created g2")
    
    db.commit()
    print("Done")
else:
    print("Society 7 not found")

