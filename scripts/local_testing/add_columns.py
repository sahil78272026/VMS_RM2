import sys
import os
sys.path.append(os.getcwd())
from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN allow_guard_force_entry BOOLEAN DEFAULT FALSE NOT NULL;"))
        print("Added allow_guard_force_entry to users")
    except Exception as e:
        print("Error adding allow_guard_force_entry:", e)
        
    try:
        conn.execute(text("ALTER TABLE visitor_logs ADD COLUMN is_force_approved BOOLEAN DEFAULT FALSE NOT NULL;"))
        print("Added is_force_approved to visitor_logs")
    except Exception as e:
        print("Error adding is_force_approved:", e)

    try:
        conn.execute(text("ALTER TABLE visitor_logs ADD COLUMN force_approve_reason VARCHAR(200);"))
        print("Added force_approve_reason to visitor_logs")
    except Exception as e:
        print("Error adding force_approve_reason:", e)
    conn.commit()
