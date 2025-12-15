from flask import Flask, request
from .extensions import db, migrate, jwt, cors
from . import models
from .auth_routes import bp as auth_bp
from .visitor_routes import bp as visitors_bp
from .residents_routes import bp as residents_bp
from .guard_routes import bp as guards_bp
from .qr_routes import qr_bp
from .flat_routes import bp as flats_bp
from .admin_routes import bp as admin_bp
from config import Config


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



    return app

