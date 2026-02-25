from flask import Flask, request
from .extensions import db, migrate, jwt, cors
from .models import models
from .auth_routes import bp as auth_bp
# from .residents_routes import bp as residents_bp
from .guard_routes import bp as guards_bp
from .qr_routes import qr_bp
from .flat_routes import bp as flats_bp
from .admin_routes import bp as admin_bp
from .announcements_routes import bp as announcement_bp
from .gate_routes import bp as gate_bp
from .service_routes import bp as service_bp
from config import Config
from app.repositeries.flat_repository import FlatRepository
from app.repositeries.visitor_repository import VisitorRepository
from app.repositeries.visit_repository import VisitRepository
from app.repositeries.residents_repository import ResidentRepository
from app.services.notification_service import NotificationService
from app.services.visitor_service import VisitorService
from app.services.residents_service import ResidentService
from app.routes.visitor_routes import create_visitor_routes
from app.routes.resident_routes import create_resident_routes

SUFFIX = "api"

def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)


    
    cors(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    visitor_repo = VisitorRepository()
    flat_repo = FlatRepository()
    visit_repo = VisitRepository()
    resident_repo = ResidentRepository()
    notification_service = NotificationService()
    visitor_service = VisitorService(visitor_repo, flat_repo, visit_repo, resident_repo, notification_service)
    resident_service = ResidentService(resident_repo)
    visitors_bp = create_visitor_routes(visitor_service)
    residents_bp = create_resident_routes(resident_service)
    
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            return "", 200


    # blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(visitors_bp, url_prefix="/api/visitors")
    app.register_blueprint(residents_bp, url_prefix="/api/residents")
    app.register_blueprint(guards_bp, url_prefix="/api/guards")
    app.register_blueprint(qr_bp, url_prefix="/api/qr")
    app.register_blueprint(flats_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api")
    app.register_blueprint(announcement_bp, url_prefix="/api")
    app.register_blueprint(gate_bp, url_prefix="/api")
    app.register_blueprint(service_bp, url_prefix="/api")
    # app.register_blueprint(uploads_routes, url_prefix="/{SUFFIX}")



    return app

