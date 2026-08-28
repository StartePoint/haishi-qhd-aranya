from flask import Blueprint, request

from app import db
from app.models import Config, utcnow
from app.routes.catalog import CONFIG_KEYS
from app.utils.decorators import admin_required
from app.utils.respond import fail, ok

admin_config_bp = Blueprint("admin_config", __name__)


@admin_config_bp.get("/admin/configs")
@admin_required
def get_configs():
    rows = Config.query.all()
    data = {k: "" for k in CONFIG_KEYS}
    for row in rows:
        data[row.key] = row.value or ""
    return ok({"configs": data})


@admin_config_bp.put("/admin/configs")
@admin_required
def set_configs():
    body = request.get_json(silent=True) or {}
    configs = body.get("configs") or body
    if not isinstance(configs, dict):
        return fail("configs 无效")
    for key in CONFIG_KEYS:
        if key not in configs:
            continue
        value = "" if configs[key] is None else str(configs[key])
        row = Config.query.filter_by(key=key).first()
        if row:
            row.value = value
            row.updated_at = utcnow()
        else:
            db.session.add(Config(key=key, value=value))
    db.session.commit()
    return ok({})
