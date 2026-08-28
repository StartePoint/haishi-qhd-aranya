from flask import Blueprint, request
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash

from app.models import Admin
from app.utils.respond import fail, ok

admin_auth_bp = Blueprint("admin_auth", __name__)


@admin_auth_bp.post("/admin/auth/login")
def admin_login():
    body = request.get_json(silent=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    admin = Admin.query.filter_by(username=username).first()
    if not admin or not check_password_hash(admin.password_hash, password):
        return fail("账号或密码错误", code=401)
    token = create_access_token(
        identity=str(admin.id),
        additional_claims={
            "admin_id": admin.id,
            "role": "admin",
            "username": admin.username,
        },
    )
    return ok({"token": token, "username": admin.username})
