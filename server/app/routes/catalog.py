from flask import Blueprint, request

from app.models import Category, Config, Product
from app.services.pricing import parse_gallery, product_price_summary
from app.utils.respond import fail, ok

catalog_bp = Blueprint("catalog", __name__)

CONFIG_KEYS = [
    "announcementTitle",
    "announcementContent",
    "nextPurchaseDate",
    "cutoffText",
    "customerWechat",
    "customerWorkWechatUrl",
    "guideText",
    "aboutText",
    "shippingNote",
    "leadSuccessText",
]


def config_map():
    rows = Config.query.all()
    data = {k: "" for k in CONFIG_KEYS}
    for row in rows:
        data[row.key] = row.value or ""
    return data


def product_card(p: Product):
    summary = product_price_summary(p)
    return {
        "id": p.id,
        "name": p.name,
        "cover": p.cover,
        "price_summary": summary,
        # camelCase for existing miniprogram
        "priceSummary": {
            "referenceFen": summary["reference_fen"],
            "serviceFeeFen": summary["service_fee_fen"],
            "totalFen": summary["total_fen"],
            "askServiceFee": summary["ask_service_fee"],
            "mainText": summary["main_text"],
            "subText": summary["sub_text"],
            "ruleLabel": summary["rule_label"],
        },
    }


@catalog_bp.get("/catalog/home")
def home():
    cfg = config_map()
    enabled_ids = [
        c.id for c in Category.query.filter_by(enabled=True).order_by(Category.sort.asc())
    ]
    q = Product.query.filter_by(on_sale=True, is_recommended=True)
    if enabled_ids:
        q = q.filter(Product.category_id.in_(enabled_ids))
    else:
        q = q.filter(Product.id == -1)
    products = q.order_by(Product.sort.asc()).limit(10).all()
    return ok(
        {
            "announcementTitle": cfg["announcementTitle"],
            "announcementContent": cfg["announcementContent"],
            "nextPurchaseDate": cfg["nextPurchaseDate"],
            "cutoffText": cfg["cutoffText"],
            "customerWechat": cfg["customerWechat"],
            "customerWorkWechatUrl": cfg["customerWorkWechatUrl"],
            "recommended": [product_card(p) for p in products],
        }
    )


@catalog_bp.get("/catalog/categories")
def categories():
    rows = (
        Category.query.filter_by(enabled=True).order_by(Category.sort.asc()).all()
    )
    return ok(
        {
            "list": [
                {"id": c.id, "name": c.name, "icon": c.icon or ""} for c in rows
            ]
        }
    )


@catalog_bp.get("/catalog/products")
def products():
    from app.models import SubCategory

    category_id = request.args.get("category_id", type=int)
    sub_category_id = request.args.get("sub_category_id", type=int)
    page = request.args.get("page", 1, type=int) or 1
    page_size = request.args.get("page_size", 20, type=int) or 20
    if not category_id:
        return fail("缺少 category_id")
    cat = Category.query.get(category_id)
    if not cat or not cat.enabled:
        return ok({"list": [], "total": 0, "page": page, "page_size": page_size, "subCategories": []})

    subs = (
        SubCategory.query.filter_by(category_id=category_id, enabled=True)
        .order_by(SubCategory.sort.asc())
        .all()
    )
    q = Product.query.filter_by(category_id=category_id, on_sale=True)
    if sub_category_id:
        q = q.filter_by(sub_category_id=sub_category_id)
    total = q.count()
    rows = (
        q.order_by(Product.sort.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return ok(
        {
            "subCategories": [{"id": "", "name": "全部"}]
            + [{"id": s.id, "name": s.name} for s in subs],
            "list": [product_card(p) for p in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@catalog_bp.get("/catalog/products/<int:product_id>")
def product_detail(product_id):
    p = Product.query.get(product_id)
    if not p or not p.on_sale:
        return fail("商品不存在或已下架", code=404)
    cat = Category.query.get(p.category_id)
    if not cat or not cat.enabled:
        return fail("商品不可见", code=404)
    cfg = config_map()
    summary = product_price_summary(p)
    card = product_card(p)
    return ok(
        {
            **card,
            "gallery": parse_gallery(p),
            "specText": p.spec_text or "",
            "detailHtml": p.detail_html or "",
            "shippingNote": cfg["shippingNote"],
            "customerWechat": cfg["customerWechat"],
            "customerWorkWechatUrl": cfg["customerWorkWechatUrl"],
            "leadSuccessText": cfg["leadSuccessText"] or "将在 24 小时内联系您",
            "priceSummary": {
                **card["priceSummary"],
                "referenceFenText": f"{(summary['reference_fen'] or 0) / 100:.2f}",
                "serviceFeeFenText": (
                    f"{(summary['service_fee_fen'] or 0) / 100:.2f}"
                    if summary["service_fee_fen"] is not None
                    else ""
                ),
                "totalFenText": f"{(summary['total_fen'] or 0) / 100:.2f}",
            },
        }
    )


@catalog_bp.get("/catalog/article")
def article():
    cfg = config_map()
    t = request.args.get("type") or "guide"
    if t == "about":
        return ok({"title": "关于我们", "content": cfg["aboutText"] or ""})
    return ok({"title": "代购须知", "content": cfg["guideText"] or ""})
