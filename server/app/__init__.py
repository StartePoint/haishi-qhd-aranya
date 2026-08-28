import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
jwt = JWTManager()


def create_app(config_name=None):
    config_name = config_name or os.getenv("FLASK_ENV", "development")
    app = Flask(__name__)
    from config import config as config_map

    app.config.from_object(config_map.get(config_name, config_map["default"]))
    db.init_app(app)
    jwt.init_app(app)
    CORS(app)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok", "message": "haishi api ok"})

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    from app import models  # noqa: F401
    from app.routes.auth import auth_bp
    from app.routes.admin_auth import admin_auth_bp
    from app.routes.catalog import catalog_bp
    from app.routes.leads import leads_bp
    from app.routes.admin_catalog import admin_catalog_bp
    from app.routes.admin_config import admin_config_bp
    from app.routes.admin_leads import admin_leads_bp
    from app.routes.admin_upload import admin_upload_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_auth_bp)
    app.register_blueprint(catalog_bp)
    app.register_blueprint(leads_bp)
    app.register_blueprint(admin_catalog_bp)
    app.register_blueprint(admin_config_bp)
    app.register_blueprint(admin_leads_bp)
    app.register_blueprint(admin_upload_bp)

    with app.app_context():
        db.create_all()
        from app.bootstrap import ensure_admin

        ensure_admin()

    return app
