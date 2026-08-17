import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal, engine
from app.models import Base, User
from sqlalchemy.orm import Session
from sqlalchemy import text

def run():
    db = SessionLocal()
    
    super_admins = db.query(User).filter_by(is_super_admin=True).all()
    sa_data = []
    for sa in super_admins:
        sa_data.append({
            'name': sa.name,
            'phone': sa.phone,
            'email': sa.email,
            'password_hash': sa.password_hash,
            'role': sa.role,
            'status': sa.status,
            'is_super_admin': sa.is_super_admin
        })
        
    print(f"Saved {len(sa_data)} super admins.")
    
    # Close session to release locks
    db.close()

    with engine.connect() as con:
        # Get all table names
        tables = Base.metadata.sorted_tables
        table_names = [table.name for table in tables]
        
        truncate_sql = f"TRUNCATE TABLE {', '.join(table_names)} RESTART IDENTITY CASCADE;"
        print("Executing:", truncate_sql)
        con.execute(text(truncate_sql))
        con.commit()

    db = SessionLocal()
    for data in sa_data:
        u = User(**data)
        db.add(u)
    db.commit()
    db.close()
    print("Database cleared, super admins restored.")

if __name__ == "__main__":
    run()
