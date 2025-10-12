# in built
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

#local imports
from extensions import db, migrate
from settings import DATABASE_URL,SECRET_KEY
from routes import main_bp



def create_app():
    app = Flask(__name__)

    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = SECRET_KEY # for session encryption

    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)

    app.register_blueprint(main_bp)
    from models import Flats, Guard, Visitors, Residents

    return app

app = create_app()

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)

