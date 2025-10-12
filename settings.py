from dotenv import load_dotenv
import os
load_dotenv(override=True)
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv('SECRET_KEY', 'supersecretkey')