"""
run.py — Application Entry Point for FastAPI

Development:
    python run.py

Production (with Uvicorn):
    uvicorn app.main:app --host 0.0.0.0 --port 5000 --workers 4

Database Migrations:
    alembic revision --autogenerate -m "message"
    alembic upgrade head
"""

import os
from dotenv import load_dotenv
load_dotenv()

import time
import uvicorn
import logging

os.environ["TZ"] = "Asia/Kolkata"
time.tzset()

logging.Formatter.converter = time.localtime
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

pass

if __name__ == "__main__":
    port  = int(os.getenv("PORT", 5000))
    debug = os.getenv("APP_DEBUG", "true").lower() == "true"
    
    logging.info(f"Starting RM2 VMS on port {port} | debug={debug}")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=debug
    )
