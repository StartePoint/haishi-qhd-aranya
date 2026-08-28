from flask import current_app
from werkzeug.security import generate_password_hash

from app import db
from app.models import Admin


def ensure_admin():
    if Admin.query.count() > 0:
        return
    username = current_app.config["BOOTSTRAP_ADMIN_USER"]
    password = current_app.config["BOOTSTRAP_ADMIN_PASSWORD"]
    admin = Admin(
        username=username,
        password_hash=generate_password_hash(password),
    )
    db.session.add(admin)
    db.session.commit()
