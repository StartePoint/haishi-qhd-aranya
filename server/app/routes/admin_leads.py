import json
from datetime import datetime

from flask import Blueprint, request

from app import db
from app.models import Lead, utcnow
from app.utils.decorators import admin_required
from app.utils.respond import fail, ok

admin_leads_bp = Blueprint("admin_leads", __name__)
STATUS = {"new", "contacted", "won", "closed"}


@admin_leads_bp.get("/admin/leads")
@admin_required
def list_leads():
    status = request.args.get("status")
    product_id = request.args.get("product_id", type=int)
    page = request.args.get("page", 1, type=int) or 1
    page_size = request.args.get("page_size", 50, type=int) or 50
    q = Lead.query
    if status:
        q = q.filter_by(status=status)
    if product_id:
        q = q.filter_by(product_id=product_id)
    from_ts = request.args.get("from")
    to_ts = request.args.get("to")
    if from_ts:
        try:
            q = q.filter(Lead.created_at >= datetime.fromisoformat(from_ts))
        except ValueError:
            pass
    if to_ts:
        try:
            q = q.filter(Lead.created_at <= datetime.fromisoformat(to_ts))
        except ValueError:
            pass
    total = q.count()
    rows = (
        q.order_by(Lead.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
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
                "_id": l.id,
                "id": l.id,
                "productId": l.product_id,
                "contactName": l.contact_name,
                "phone": l.phone,
                "wechat": l.wechat,
                "qty": l.qty,
                "remark": l.remark,
                "status": l.status,
                "adminRemark": l.admin_remark,
                "snapshot": snap,
                "createdAt": int(l.created_at.timestamp() * 1000)
                if l.created_at
                else None,
            }
        )
    return ok({"list": list_data, "total": total})


@admin_leads_bp.patch("/admin/leads/<int:lid>")
@admin_required
def patch_lead(lid):
    lead = Lead.query.get(lid)
    if not lead:
        return fail("不存在", code=404)
    body = request.get_json(silent=True) or {}
    status = body.get("status")
    if status and status not in STATUS:
        return fail("状态无效")
    if status:
        lead.status = status
    if "adminRemark" in body or "admin_remark" in body:
        lead.admin_remark = str(
            body.get("adminRemark")
            if "adminRemark" in body
            else body.get("admin_remark")
            or ""
        )
    lead.updated_at = utcnow()
    db.session.commit()
    return ok({"id": lead.id})
