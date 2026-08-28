import json

from flask import Blueprint, request

from app import db
from app.models import Category, FeeRule, Product, SubCategory, utcnow
from app.services.pricing import fee_rule_to_dict, parse_gallery
from app.utils.decorators import admin_required
from app.utils.respond import fail, ok

admin_catalog_bp = Blueprint("admin_catalog", __name__)


def upsert_fee_rule(*, scope, category_id=None, product_id=None, type_=None, fixed=0, rate=0):
    q = FeeRule.query.filter_by(scope=scope)
    if scope == "category":
        q = q.filter_by(category_id=category_id)
    else:
        q = q.filter_by(product_id=product_id)
    for old in q.all():
        db.session.delete(old)
    if not type_:
        return
    db.session.add(
        FeeRule(
            scope=scope,
            category_id=category_id,
            product_id=product_id,
            type=type_,
            fixed_amount_fen=int(fixed or 0),
            rate_bps=int(rate or 0),
        )
    )


@admin_catalog_bp.get("/admin/categories")
@admin_required
def list_categories():
    rows = Category.query.order_by(Category.sort.asc()).all()
    return ok(
        {
            "list": [
                {
                    "_id": c.id,
                    "id": c.id,
                    "name": c.name,
                    "icon": c.icon,
                    "sort": c.sort,
                    "enabled": c.enabled,
                }
                for c in rows
            ]
        }
    )


@admin_catalog_bp.post("/admin/categories")
@admin_required
def create_category():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        return fail("名称必填")
    c = Category(
        name=name,
        icon=body.get("icon") or "",
        sort=int(body.get("sort") or 0),
        enabled=bool(body.get("enabled", True)),
    )
    db.session.add(c)
    db.session.commit()
    return ok({"id": c.id})


@admin_catalog_bp.put("/admin/categories/<int:cid>")
@admin_required
def update_category(cid):
    c = Category.query.get(cid)
    if not c:
        return fail("不存在", code=404)
    body = request.get_json(silent=True) or {}
    if "name" in body:
        c.name = str(body.get("name") or "").strip() or c.name
    if "icon" in body:
        c.icon = body.get("icon") or ""
    if "sort" in body:
        c.sort = int(body.get("sort") or 0)
    if "enabled" in body:
        c.enabled = bool(body.get("enabled"))
    c.updated_at = utcnow()
    db.session.commit()
    return ok({"id": c.id})


@admin_catalog_bp.patch("/admin/categories/<int:cid>")
@admin_required
def patch_category(cid):
    return update_category(cid)


@admin_catalog_bp.get("/admin/sub-categories")
@admin_required
def list_sub_categories():
    category_id = request.args.get("category_id", type=int)
    if not category_id:
        return fail("缺少 category_id")
    rows = (
        SubCategory.query.filter_by(category_id=category_id)
        .order_by(SubCategory.sort.asc())
        .all()
    )
    return ok(
        {
            "list": [
                {
                    "_id": s.id,
                    "id": s.id,
                    "categoryId": s.category_id,
                    "name": s.name,
                    "sort": s.sort,
                    "enabled": s.enabled,
                }
                for s in rows
            ]
        }
    )


@admin_catalog_bp.post("/admin/sub-categories")
@admin_required
def create_sub_category():
    body = request.get_json(silent=True) or {}
    category_id = body.get("categoryId") or body.get("category_id")
    name = (body.get("name") or "").strip()
    if not category_id or not name:
        return fail("品类与名称必填")
    if not Category.query.get(int(category_id)):
        return fail("品类不存在")
    s = SubCategory(
        category_id=int(category_id),
        name=name,
        sort=int(body.get("sort") or 0),
        enabled=bool(body.get("enabled", True)),
    )
    db.session.add(s)
    db.session.commit()
    return ok({"id": s.id})


@admin_catalog_bp.put("/admin/sub-categories/<int:sid>")
@admin_required
def update_sub_category(sid):
    s = SubCategory.query.get(sid)
    if not s:
        return fail("不存在", code=404)
    body = request.get_json(silent=True) or {}
    if "name" in body:
        s.name = str(body.get("name") or "").strip() or s.name
    if "sort" in body:
        s.sort = int(body.get("sort") or 0)
    if "enabled" in body:
        s.enabled = bool(body.get("enabled"))
    s.updated_at = utcnow()
    db.session.commit()
    return ok({"id": s.id})


@admin_catalog_bp.get("/admin/products")
@admin_required
def list_products():
    category_id = request.args.get("category_id", type=int)
    page = request.args.get("page", 1, type=int) or 1
    page_size = request.args.get("page_size", 100, type=int) or 100
    q = Product.query
    if category_id:
        q = q.filter_by(category_id=category_id)
    total = q.count()
    rows = (
        q.order_by(Product.sort.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return ok(
        {
            "list": [
                {
                    "_id": p.id,
                    "id": p.id,
                    "name": p.name,
                    "cover": p.cover,
                    "categoryId": p.category_id,
                    "subCategoryId": p.sub_category_id,
                    "referencePriceFen": p.reference_price_fen,
                    "isRecommended": p.is_recommended,
                    "sort": p.sort,
                    "onSale": p.on_sale,
                }
                for p in rows
            ],
            "total": total,
        }
    )


@admin_catalog_bp.get("/admin/products/<int:pid>")
@admin_required
def get_product(pid):
    p = Product.query.get(pid)
    if not p:
        return fail("不存在", code=404)
    rule = FeeRule.query.filter_by(scope="product", product_id=p.id).first()
    return ok(
        {
            "product": {
                "_id": p.id,
                "id": p.id,
                "name": p.name,
                "cover": p.cover,
                "gallery": parse_gallery(p),
                "specText": p.spec_text,
                "detailHtml": p.detail_html,
                "categoryId": p.category_id,
                "subCategoryId": p.sub_category_id,
                "referencePriceFen": p.reference_price_fen,
                "isRecommended": p.is_recommended,
                "sort": p.sort,
                "onSale": p.on_sale,
            },
            "productFeeRule": fee_rule_to_dict(rule),
        }
    )


@admin_catalog_bp.post("/admin/products")
@admin_required
def create_product():
    return save_product(None)


@admin_catalog_bp.put("/admin/products/<int:pid>")
@admin_required
def update_product(pid):
    return save_product(pid)


def save_product(pid):
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    sub_id = body.get("subCategoryId") or body.get("sub_category_id")
    if not name or not sub_id:
        return fail("名称与种类必填")
    sub = SubCategory.query.get(int(sub_id))
    if not sub:
        return fail("种类不存在")
    gallery = body.get("gallery") or []
    if isinstance(gallery, str):
        try:
            gallery = json.loads(gallery)
        except Exception:
            gallery = []
    if pid:
        p = Product.query.get(pid)
        if not p:
            return fail("不存在", code=404)
    else:
        p = Product()
        db.session.add(p)
    p.name = name
    p.sub_category_id = sub.id
    p.category_id = sub.category_id
    p.cover = body.get("cover") or ""
    p.gallery_json = json.dumps(gallery, ensure_ascii=False)
    p.spec_text = body.get("specText") or body.get("spec_text") or ""
    p.detail_html = body.get("detailHtml") or body.get("detail_html") or ""
    p.reference_price_fen = int(
        body.get("referencePriceFen")
        if body.get("referencePriceFen") is not None
        else body.get("reference_price_fen")
        or 0
    )
    p.is_recommended = bool(
        body.get("isRecommended")
        if "isRecommended" in body
        else body.get("is_recommended", False)
    )
    p.sort = int(body.get("sort") or 0)
    p.on_sale = bool(body.get("onSale") if "onSale" in body else body.get("on_sale", True))
    p.updated_at = utcnow()
    db.session.flush()

    if "feeRule" in body or "fee_rule" in body:
        fee = body.get("feeRule") if "feeRule" in body else body.get("fee_rule")
        if fee is None:
            upsert_fee_rule(scope="product", product_id=p.id, type_=None)
        else:
            upsert_fee_rule(
                scope="product",
                product_id=p.id,
                type_=fee.get("type"),
                fixed=fee.get("fixedAmountFen") or fee.get("fixed_amount_fen"),
                rate=fee.get("rateBps") or fee.get("rate_bps"),
            )
    db.session.commit()
    return ok({"id": p.id})


@admin_catalog_bp.put("/admin/categories/<int:cid>/fee-rule")
@admin_required
def save_category_fee(cid):
    if not Category.query.get(cid):
        return fail("品类不存在", code=404)
    body = request.get_json(silent=True) or {}
    upsert_fee_rule(
        scope="category",
        category_id=cid,
        type_=body.get("type"),
        fixed=body.get("fixedAmountFen") or body.get("fixed_amount_fen"),
        rate=body.get("rateBps") or body.get("rate_bps"),
    )
    db.session.commit()
    return ok({})


@admin_catalog_bp.delete("/admin/products/<int:pid>/fee-rule")
@admin_required
def delete_product_fee(pid):
    upsert_fee_rule(scope="product", product_id=pid, type_=None)
    db.session.commit()
    return ok({})
