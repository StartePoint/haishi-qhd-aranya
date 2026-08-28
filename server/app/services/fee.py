def fen_to_yuan_text(fen: int) -> str:
    return f"{(int(fen or 0) / 100):.2f}"


def calc_service_fee_fen(rule, reference_price_fen, qty):
    if not rule or not rule.get("type"):
        return None
    q = max(1, int(qty or 1))
    ref = int(reference_price_fen or 0)
    if rule["type"] == "fixed":
        return int(rule.get("fixed_amount_fen") or 0) * q
    if rule["type"] == "percent":
        rate_bps = int(rule.get("rate_bps") or 0)
        return round(ref * rate_bps / 10000) * q
    return None


def rule_label(rule):
    if not rule:
        return "详询客服"
    if rule["type"] == "fixed":
        return f"代购服务费 ¥{fen_to_yuan_text(rule.get('fixed_amount_fen'))}/件"
    if rule["type"] == "percent":
        pct = int(rule.get("rate_bps") or 0) / 100
        return f"代购服务费 {pct:.2f}%"
    return "详询客服"


def build_price_summary(reference_price_fen, rule):
    reference_fen = int(reference_price_fen or 0)
    service_fee_fen = calc_service_fee_fen(rule, reference_fen, 1)
    if service_fee_fen is None:
        return {
            "reference_fen": reference_fen,
            "service_fee_fen": None,
            "total_fen": reference_fen,
            "ask_service_fee": True,
            "main_text": f"约 ¥{fen_to_yuan_text(reference_fen)}",
            "sub_text": "服务费详询客服",
            "rule_label": "详询客服",
        }
    total = reference_fen + service_fee_fen
    return {
        "reference_fen": reference_fen,
        "service_fee_fen": service_fee_fen,
        "total_fen": total,
        "ask_service_fee": False,
        "main_text": f"约 ¥{fen_to_yuan_text(total)}",
        "sub_text": (
            f"参考价 ¥{fen_to_yuan_text(reference_fen)} · "
            f"服务费 ¥{fen_to_yuan_text(service_fee_fen)}"
        ),
        "rule_label": rule_label(rule),
    }


def resolve_rule(product_rule, category_rule):
    return product_rule or category_rule or None
