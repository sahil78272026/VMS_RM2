# in built
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

#local imports
from settings import DATABASE_URL
from models import *
from routes import main_bp

# Initialize extensions (outside app factory)
db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)

    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    app.register_blueprint(main_bp)


    return app

app = create_app()

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)

