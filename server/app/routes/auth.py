from flask import Blueprint, g, request
from flask_jwt_extended import create_access_token

from app import db
from app.models import User
from app.services.wechat import code_to_openid
from app.utils.decorators import jwt_required_user
from app.utils.respond import fail, ok

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/auth/wechat_login")
def wechat_login():
    body = request.get_json(silent=True) or {}
    code = (body.get("code") or "").strip() or "dev"
    try:
        openid = code_to_openid(code)
    except Exception as exc:
        return fail(str(exc), code=400)

    user = User.query.filter_by(openid=openid).first()
    if not user:
        user = User(openid=openid)
        db.session.add(user)
        db.session.commit()

    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "openid": user.openid,
            "user_id": user.id,
            "role": "user",
        },
    )
    return ok(
        {
            "token": token,
            "user": {
                "id": user.id,
                "openid": user.openid,
                "nickname": user.nickname,
                "avatar": user.avatar,
            },
        }
    )


@auth_bp.put("/auth/profile")
@jwt_required_user
def update_profile():
    body = request.get_json(silent=True) or {}
    user = User.query.get(int(g.user_id))
    if not user:
        return fail("用户不存在", code=404)
    if "nickname" in body:
        user.nickname = str(body.get("nickname") or "")[:64]
    if "avatar" in body:
        user.avatar = str(body.get("avatar") or "")[:512]
    db.session.commit()
    return ok(
        {
            "id": user.id,
            "nickname": user.nickname,
            "avatar": user.avatar,
        }
    )
