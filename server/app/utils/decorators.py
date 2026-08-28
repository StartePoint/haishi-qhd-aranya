from functools import wraps

from flask import g
from flask_jwt_extended import get_jwt, verify_jwt_in_request

from app.utils.respond import fail


def jwt_required_user(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") != "user":
                return fail("请先登录", code=401)
            g.user_id = claims.get("user_id") or claims.get("sub")
            g.openid = claims.get("openid")
            if not g.openid:
                return fail("请先登录", code=401)
        except Exception:
            return fail("请先登录", code=401)
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") != "admin":
                return fail("无管理员权限", code=403)
            g.admin_id = claims.get("admin_id") or claims.get("sub")
        except Exception:
            return fail("请重新登录", code=401)
        return fn(*args, **kwargs)

    return wrapper
