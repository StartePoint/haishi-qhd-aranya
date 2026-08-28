from datetime import datetime, timezone

from app import db


def utcnow():
    return datetime.now(timezone.utc)


class Admin(db.Model):
    __tablename__ = "admins"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    openid = db.Column(db.String(128), unique=True, nullable=False)
    nickname = db.Column(db.String(64), default="")
    avatar = db.Column(db.String(512), default="")
    created_at = db.Column(db.DateTime, default=utcnow)


class Category(db.Model):
    __tablename__ = "categories"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)
    icon = db.Column(db.String(512), default="")
    sort = db.Column(db.Integer, default=0)
    enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class SubCategory(db.Model):
    __tablename__ = "sub_categories"
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    name = db.Column(db.String(64), nullable=False)
    sort = db.Column(db.Integer, default=0)
    enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class Product(db.Model):
    __tablename__ = "products"
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    sub_category_id = db.Column(
        db.Integer, db.ForeignKey("sub_categories.id"), nullable=False
    )
    name = db.Column(db.String(128), nullable=False)
    cover = db.Column(db.String(512), default="")
    gallery_json = db.Column(db.Text, default="[]")
    spec_text = db.Column(db.String(255), default="")
    detail_html = db.Column(db.Text, default="")
    reference_price_fen = db.Column(db.Integer, default=0)
    is_recommended = db.Column(db.Boolean, default=False)
    sort = db.Column(db.Integer, default=0)
    on_sale = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class FeeRule(db.Model):
    __tablename__ = "fee_rules"
    id = db.Column(db.Integer, primary_key=True)
    scope = db.Column(db.String(16), nullable=False)  # category | product
    category_id = db.Column(db.Integer, nullable=True)
    product_id = db.Column(db.Integer, nullable=True)
    type = db.Column(db.String(16), nullable=False)  # fixed | percent
    fixed_amount_fen = db.Column(db.Integer, default=0)
    rate_bps = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
    created_at = db.Column(db.DateTime, default=utcnow)


class Config(db.Model):
    __tablename__ = "configs"
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(64), unique=True, nullable=False)
    value = db.Column(db.Text, default="")
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class Lead(db.Model):
    __tablename__ = "leads"
    id = db.Column(db.Integer, primary_key=True)
    openid = db.Column(db.String(128), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    contact_name = db.Column(db.String(64), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    wechat = db.Column(db.String(64), default="")
    qty = db.Column(db.Integer, default=1)
    remark = db.Column(db.Text, default="")
    status = db.Column(db.String(16), default="new")
    admin_remark = db.Column(db.Text, default="")
    snapshot_json = db.Column(db.Text, default="{}")
    created_at = db.Column(db.DateTime, default=utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
