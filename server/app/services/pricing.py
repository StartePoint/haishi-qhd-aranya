import json

from typing import Optional

from app.models import FeeRule
from app.services.fee import build_price_summary, resolve_rule


def fee_rule_to_dict(rule: Optional[FeeRule]):
    if not rule:
        return None
    return {
        "type": rule.type,
        "fixed_amount_fen": rule.fixed_amount_fen,
        "rate_bps": rule.rate_bps,
    }


def resolve_product_rule(product):
    product_rule = FeeRule.query.filter_by(
        scope="product", product_id=product.id
    ).first()
    category_rule = FeeRule.query.filter_by(
        scope="category", category_id=product.category_id
    ).first()
    return resolve_rule(fee_rule_to_dict(product_rule), fee_rule_to_dict(category_rule))


def product_price_summary(product):
    return build_price_summary(product.reference_price_fen, resolve_product_rule(product))


def parse_gallery(product):
    try:
        return json.loads(product.gallery_json or "[]")
    except Exception:
        return []
