import os
from sqlalchemy import create_engine, text
from app.config.settings import settings

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN allow_guard_force_entry BOOLEAN DEFAULT FALSE NOT NULL;"))
        conn.commit()
        print("Successfully added column allow_guard_force_entry to users table.")
    except Exception as e:
        print(f"Error adding column: {e}")

