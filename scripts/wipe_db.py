import os
from dotenv import dotenv_values
import sqlalchemy as sa
from sqlalchemy.engine import create_engine

def wipe_database(url, env_name):
    print(f"Wiping {env_name} database...")
    engine = create_engine(url)
    
    # Reflect table outside transaction to avoid deadlocks
    metadata = sa.MetaData()
    users_table = sa.Table('users', metadata, autoload_with=engine)
    
    with engine.begin() as conn:
        # Save superadmins
        print("  Saving superadmins...")
        superadmin_data = conn.execute(sa.text("SELECT * FROM users WHERE role = 'super_admin'")).fetchall()
        
        # Get all tables
        tables = conn.execute(sa.text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'alembic_version'")).scalars().all()
        
        # Truncate all tables
        print("  Truncating tables...")
        truncate_sql = f"TRUNCATE TABLE {', '.join(tables)} CASCADE;"
        conn.execute(sa.text(truncate_sql))
        
        # Restore superadmins
        print(f"  Restoring {len(superadmin_data)} superadmin(s)...")
        if superadmin_data:
            # Convert rows to dicts
            insert_data = [dict(row._mapping) for row in superadmin_data]
            
            conn.execute(users_table.insert(), insert_data)
            
        print(f"✅ {env_name} wiped successfully!")

if __name__ == "__main__":
    backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
    
    prod_env = dotenv_values(os.path.join(backend_dir, ".env.prod"))
    dev_env = dotenv_values(os.path.join(backend_dir, ".env"))
    
    prod_url = prod_env.get("DATABASE_URL")
    dev_url = dev_env.get("DATABASE_URL")
    
    wipe_database(dev_url, "DEV")
    wipe_database(prod_url, "PROD")
