from app.services.fee import calc_service_fee_fen, build_price_summary


def test_fixed_per_piece():
    assert calc_service_fee_fen({"type": "fixed", "fixed_amount_fen": 500}, 4800, 2) == 1000


def test_percent_rounding():
    assert calc_service_fee_fen({"type": "percent", "rate_bps": 1000}, 999, 1) == 100


def test_no_rule():
    assert calc_service_fee_fen(None, 1000, 1) is None


def test_summary_with_rule():
    s = build_price_summary(4800, {"type": "fixed", "fixed_amount_fen": 500})
    assert s["total_fen"] == 5300
    assert s["ask_service_fee"] is False
    assert "53.00" in s["main_text"]


def test_summary_without_rule():
    s = build_price_summary(4800, None)
    assert s["ask_service_fee"] is True
    assert s["sub_text"] == "服务费详询客服"
