import json
import re
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, request

from app import db
from app.models import Lead, Product
from app.services.fee import calc_service_fee_fen
from app.services.pricing import product_price_summary, resolve_product_rule
from app.utils.decorators import jwt_required_user
from app.utils.respond import fail, ok
from app.routes.catalog import config_map

leads_bp = Blueprint("leads", __name__)
PHONE_RE = re.compile(r"^1\d{10}$")


@leads_bp.post("/leads")
@jwt_required_user
def create_lead():
    body = request.get_json(silent=True) or {}
    product_id = body.get("productId") or body.get("product_id")
    contact_name = (body.get("contactName") or body.get("contact_name") or "").strip()
    phone = (body.get("phone") or "").strip()
    wechat = (body.get("wechat") or "").strip()
    qty = int(body.get("qty") or 1)
    remark = (body.get("remark") or "").strip()

    if not product_id or not contact_name or not phone:
        return fail("请填写必填项")
    if not PHONE_RE.match(phone):
        return fail("手机号格式不正确")
    if qty < 1:
        return fail("数量至少为 1")

    recent = (
        Lead.query.filter_by(openid=g.openid)
        .order_by(Lead.created_at.desc())
        .first()
    )
    if recent and recent.created_at:
        created = recent.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - created < timedelta(minutes=1):
            return fail("提交过于频繁，请稍后再试", code=429)

    p = Product.query.get(int(product_id))
    if not p or not p.on_sale:
        return fail("商品不可代购", code=404)

    rule = resolve_product_rule(p)
    unit = product_price_summary(p)
    service_fee_fen = calc_service_fee_fen(rule, p.reference_price_fen, qty)
    snapshot = {
        "name": p.name,
        "referencePriceFen": p.reference_price_fen,
        "serviceFeeFen": service_fee_fen,
        "unitServiceFeeFen": unit["service_fee_fen"],
        "askServiceFee": unit["ask_service_fee"],
    }
    lead = Lead(
        openid=g.openid,
        product_id=p.id,
        contact_name=contact_name,
        phone=phone,
        wechat=wechat,
        qty=qty,
        remark=remark,
        status="new",
        snapshot_json=json.dumps(snapshot, ensure_ascii=False),
    )
    db.session.add(lead)
    db.session.commit()
    cfg = config_map()
    return ok(
        {
            "leadSuccessText": cfg.get("leadSuccessText")
            or "将在 24 小时内联系您"
        }
    )


@leads_bp.get("/leads/mine")
@jwt_required_user
def my_leads():
    rows = (
        Lead.query.filter_by(openid=g.openid)
        .order_by(Lead.created_at.desc())
        .limit(50)
        .all()
    )
    list_data = []
    for l in rows:
        try:
            snap = json.loads(l.snapshot_json or "{}")
        except Exception:
            snap = {}
        list_data.append(
            {
                "id": l.id,
                "status": l.status,
                "qty": l.qty,
                "createdAt": int(l.created_at.timestamp() * 1000)
                if l.created_at
                else None,
                "productName": snap.get("name"),
                "snapshot": snap,
            }
        )
    return ok({"list": list_data})
