from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv
load_dotenv()

from app.utils.exceptions import AppException

def create_app() -> FastAPI:
    app = FastAPI(title="RM2 VMS", version="1.0.0")

    if os.getenv("APP_ENV") == "DEV":
        import logging
        import re
        logger = logging.getLogger("uvicorn")
        db_url = os.getenv("DATABASE_URL", "sqlite:///rm2_vms.db")
        
        # Mask password in URL for safe logging
        masked_url = re.sub(r":([^@]+)@", ":***@", db_url)
        
        print("\n" + "="*50)
        print("🚀  STARTING RM2 VMS IN [DEV] MODE  🚀")
        print("="*50)
        print(f"📦 Database : {masked_url}")
        print(f"🔑 Twilio   : {'Configured' if os.getenv('TWILIO_ACCOUNT_SID') else 'Not Set'}")
        print(f"☁️  Cloudinary: {'Configured' if os.getenv('CLOUDINARY_CLOUD_NAME') else 'Not Set'}")
        print("="*50 + "\n")

    os.makedirs("static/visitors", exist_ok=True)
    app.mount("/static", StaticFiles(directory="static"), name="static")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.message,
                "data": None,
                "error": {
                    "code": exc.code,
                    "details": exc.details
                }
            }
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Something went wrong on our end.",
                "data": None,
                "error": {
                    "code": "SERVER_ERROR",
                    "details": str(exc)
                }
            }
        )

    # Include routers here
    from app.api.auth import router as auth_router
    from app.api.announcements import router as announcements_router
    from app.api.flat_users import router as flat_users_router
    from app.api.flats import router as flats_router
    from app.api.frequent_passes import router as frequent_passes_router
    from app.api.gate_sessions import router as gate_sessions_router
    from app.api.gates import router as gates_router
    from app.api.guards import router as guards_router
    from app.api.maintenance import router as maintenance_router
    from app.api.notifications import router as notifications_router
    from app.api.panic_alerts import router as panic_alerts_router
    from app.api.pre_approvals import router as pre_approvals_router
    from app.api.reports import router as reports_router
    from app.api.visitor_logs import router as visitor_logs_router
    from app.api.visitor_ratings import router as visitor_ratings_router
    from app.api.visitors import router as visitors_router
    from app.api.users import router as users_router
    from app.api.sse import router as sse_router

    app.include_router(auth_router)
    app.include_router(announcements_router)
    app.include_router(flat_users_router)
    app.include_router(flats_router)
    app.include_router(frequent_passes_router)
    app.include_router(gate_sessions_router)
    app.include_router(gates_router)
    app.include_router(guards_router)
    app.include_router(maintenance_router)
    app.include_router(notifications_router)
    app.include_router(panic_alerts_router)
    app.include_router(pre_approvals_router)
    app.include_router(reports_router)
    app.include_router(visitor_logs_router)
    app.include_router(visitor_ratings_router)
    app.include_router(visitors_router)
    app.include_router(users_router)
    app.include_router(sse_router)

    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from app.api.auth import limiter
    
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @app.get("/health")
    def health():
        return {
            "success": True,
            "message": "RM2 VMS is running",
            "data": {
                "version": "1.0.0",
                "env": "development"
            },
            "error": None
        }

    return app

app = create_app()
