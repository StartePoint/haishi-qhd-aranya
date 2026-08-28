import requests
from flask import current_app


def code_to_openid(code: str) -> str:
    if current_app.config.get("WECHAT_MOCK_OPENID"):
        return f"mock_openid_{code or 'dev'}"

    appid = current_app.config.get("WECHAT_APPID") or ""
    secret = current_app.config.get("WECHAT_SECRET") or ""
    if not appid or not secret:
        raise RuntimeError("未配置 WECHAT_APPID / WECHAT_SECRET")

    url = "https://api.weixin.qq.com/sns/jscode2session"
    resp = requests.get(
        url,
        params={
            "appid": appid,
            "secret": secret,
            "js_code": code,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    data = resp.json()
    openid = data.get("openid")
    if not openid:
        raise RuntimeError(data.get("errmsg") or "微信登录失败")
    return openid
