# 海拾 Flask + SQLite 服务端与管理端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.  
> **Note:** 用户要求不使用 git worktree，在仓库根目录 `master` 上直接实现。

**Goal:** 用与李旺财 PetParadise 同款的 Flask + SQLite + JWT 替换云开发；管理端与小程序均通过 HTTP 完成橱窗 + 留资闭环。

**Architecture:** `server/` 内 Flask 应用（`create_app`、models、routes、services）；SQLite 文件在 `server/data/development/haishi.db`；`admin/` 改为 Bearer JWT 调 API；`miniprogram/` 去掉 `wx.cloud`，用 `utils/http.js`；删除 `server/cloudfunctions`。

**Tech Stack:** Flask 3、Flask-SQLAlchemy、Flask-JWT-Extended、flask-cors、python-dotenv、SQLite、pytest、Vue 3 + Vite + Pinia、微信小程序原生

**Specs:**  
- `docs/superpowers/specs/2026-08-29-haishi-flask-sqlite-design.md`  
- `docs/superpowers/specs/2026-08-29-haishi-anaya-daigou-design.md`

---

## File Structure

```text
server/
├── app/
│   ├── __init__.py              # create_app, db, jwt
│   ├── models/                  # Admin User Category SubCategory Product FeeRule Config Lead
│   ├── routes/                  # auth catalog leads admin_*
│   ├── services/                # fee.py wechat.py
│   └── utils/                   # respond.py decorators.py
├── config/
│   ├── __init__.py
│   └── development.py
├── data/development/uploads/
├── tests/
├── requirements.txt
├── .env.example
├── run.py
└── wsgi.py
admin/src/api/http.js            # 改为 fetch Flask
miniprogram/utils/http.js        # 替代 cloud.js
miniprogram/app.js               # 去云开发
```

运行约定：在 `server/` 目录下执行 `python run.py`，导入使用 `from app ...`（cwd = server）。

---

### Task 1: 清理云函数并搭 Flask 骨架

**Files:**
- Delete: `server/cloudfunctions/`（整目录）
- Delete: `server/scripts/sync-common.js`（不再需要）
- Create: `server/requirements.txt`
- Create: `server/run.py`
- Create: `server/wsgi.py`
- Create: `server/config/__init__.py`
- Create: `server/config/development.py`
- Create: `server/app/__init__.py`
- Create: `server/.env.example`
- Modify: `project.config.json`（去掉 cloudfunctionRoot 或改为空说明）

- [ ] **Step 1: 删除遗留云函数目录**

```bash
git rm -r server/cloudfunctions server/scripts
```

- [ ] **Step 2: 写入 `server/requirements.txt`**

```text
flask==3.1.0
flask-sqlalchemy==3.1.1
flask-jwt-extended==4.7.0
flask-cors==5.0.1
python-dotenv==1.1.0
werkzeug==3.1.3
requests==2.32.3
PyJWT==2.9.0
pytest==8.3.3
```

- [ ] **Step 3: 写入配置**

`server/config/development.py`:

```python
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "development"
DATA_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR := DATA_DIR / "uploads").mkdir(parents=True, exist_ok=True)

class DevelopmentConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_VERIFY_SUB = False
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(DATA_DIR / 'haishi.db').as_posix()}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    WECHAT_APPID = os.getenv("WECHAT_APPID", "")
    WECHAT_SECRET = os.getenv("WECHAT_SECRET", "")
    WECHAT_MOCK_OPENID = os.getenv("WECHAT_MOCK_OPENID", "1") == "1"
    BOOTSTRAP_ADMIN_USER = os.getenv("BOOTSTRAP_ADMIN_USER", "admin")
    BOOTSTRAP_ADMIN_PASSWORD = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "admin12345")
    UPLOAD_FOLDER = str(UPLOAD_DIR)
```

`server/config/__init__.py`:

```python
from config.development import DevelopmentConfig

config = {
    "development": DevelopmentConfig,
    "default": DevelopmentConfig,
}
```

- [ ] **Step 4: `server/app/__init__.py` 最小 create_app**

```python
from flask import Flask, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import os

db = SQLAlchemy()
jwt = JWTManager()

def create_app(config_name=None):
    config_name = config_name or os.getenv("FLASK_ENV", "development")
    app = Flask(__name__)
    from config import config as config_map
    app.config.from_object(config_map[config_name])
    db.init_app(app)
    jwt.init_app(app)
    CORS(app)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok", "message": "haishi api ok"})

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    with app.app_context():
        db.create_all()

    return app
```

`server/run.py`:

```python
import os
from dotenv import load_dotenv
from app import create_app

load_dotenv()
app = create_app(os.getenv("FLASK_ENV", "development"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
```

`server/wsgi.py`:

```python
import os
from dotenv import load_dotenv
from app import create_app

load_dotenv()
application = create_app(os.getenv("FLASK_ENV", "development"))
```

`server/.env.example`：按规格 §10 填写键。

- [ ] **Step 5: 安装并冒烟**

```bash
cd server
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -c "from app import create_app; create_app(); print('ok')"
```

Expected: 打印 `ok`，并生成 `data/development/haishi.db`（create_all 时尚无表也可先空库）。

- [ ] **Step 6: 更新 `project.config.json`**

删除 `cloudfunctionRoot` 字段（或设为注释不可用则直接删除该键）。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: replace cloudfunctions with Flask app skeleton"
```

---

### Task 2: 费用服务 + pytest（TDD）

**Files:**
- Create: `server/app/services/__init__.py`
- Create: `server/app/services/fee.py`
- Create: `server/tests/test_fee.py`

- [ ] **Step 1: 写失败测试 `server/tests/test_fee.py`**

```python
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
```

- [ ] **Step 2: 运行确认失败**

```bash
cd server
.\.venv\Scripts\activate
pytest tests/test_fee.py -v
```

Expected: FAIL import error

- [ ] **Step 3: 实现 `fee.py`**（语义对齐原 `shared/fee.js`，字段用 snake_case）

```python
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
        pct = (int(rule.get("rate_bps") or 0) / 100)
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
        "sub_text": f"参考价 ¥{fen_to_yuan_text(reference_fen)} · 服务费 ¥{fen_to_yuan_text(service_fee_fen)}",
        "rule_label": rule_label(rule),
    }

def resolve_rule(product_rule, category_rule):
    return product_rule or category_rule or None
```

- [ ] **Step 4: pytest 通过后 Commit**

```bash
pytest tests/test_fee.py -v
git add server/app/services server/tests
git commit -m "feat: add fee calculation service with tests"
```

---

### Task 3: 模型与响应/鉴权工具

**Files:**
- Create: `server/app/models/__init__.py`（导入所有模型）
- Create: `server/app/models/admin.py`, `user.py`, `catalog.py`, `lead.py`, `config.py`
- Create: `server/app/utils/respond.py`, `decorators.py`
- Modify: `server/app/__init__.py`（create_all 前 import models；bootstrap admin）

- [ ] **Step 1: `respond.py`**

```python
from flask import jsonify

def ok(data=None, message="成功"):
    return jsonify({"code": 0, "message": message, "data": data or {}})

def fail(message, code=1, http_status=200):
    return jsonify({"code": code, "message": message, "data": {}}), http_status
```

- [ ] **Step 2: 模型字段按规格 §5 建表**（SQLAlchemy）

要点：
- `Admin(username unique, password_hash)`
- `User(openid unique, nickname, avatar)`
- `Category`, `SubCategory`, `Product`（gallery 用 Text JSON）
- `FeeRule(scope, category_id, product_id, type, fixed_amount_fen, rate_bps)`
- `Config(key unique, value)`
- `Lead(openid, product_id, ..., status, snapshot_json Text, created_at, updated_at)`

- [ ] **Step 3: bootstrap 管理员**

在 `create_app` 的 `app_context` 中：若 `Admin.query.count()==0`，用 `generate_password_hash(BOOTSTRAP_ADMIN_PASSWORD)` 创建。

- [ ] **Step 4: 装饰器**

```python
# jwt_required_user: 校验 Bearer，g.openid / g.user_id
# admin_required: claims role == 'admin'
```

实现可用 `flask_jwt_extended.verify_jwt_in_request` + `get_jwt`；注意 `JWT_VERIFY_SUB=False`。

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: add SQLAlchemy models and auth helpers"
```

---

### Task 4: 微信登录与管理员登录 API

**Files:**
- Create: `server/app/services/wechat.py`
- Create: `server/app/routes/auth.py`
- Create: `server/app/routes/admin_auth.py`
- Modify: `server/app/__init__.py` 注册蓝图
- Create: `server/tests/test_auth_mock.py`

- [ ] **Step 1: `wechat.py`**

- 若 `WECHAT_MOCK_OPENID`：忽略 code，返回 `mock_openid_<code或固定>`  
- 否则请求 `https://api.weixin.qq.com/sns/jscode2session`

- [ ] **Step 2: 路由**

- `POST /auth/wechat_login` → upsert User → `create_access_token(identity=str(user.id), additional_claims={"openid": ..., "role": "user"})`  
- `PUT /auth/profile` JWT 用户更新 nickname/avatar  
- `POST /admin/auth/login` → 校验密码 → token claims `role: admin`

- [ ] **Step 3: 测试 mock 登录**

```python
def test_mock_wechat_login(client):
    res = client.post("/auth/wechat_login", json={"code": "test"})
    assert res.json["code"] == 0
    assert "token" in res.json["data"]
```

`conftest.py` 提供 `client` fixture：`app = create_app(); app.config['TESTING']=True; ...`

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: add wechat and admin login endpoints"
```

---

### Task 5: Catalog 与 Lead C 端 API

**Files:**
- Create: `server/app/routes/catalog.py`
- Create: `server/app/routes/leads.py`
- Create: `server/app/services/pricing.py`（根据 product 解析 fee_rule + build_price_summary）
- Create: `server/tests/test_catalog_leads.py`

实现规格 §7.1 全部路径；home 返回推荐商品（on_sale + is_recommended + category.enabled）。

Lead 创建：校验手机号、qty、1 分钟限流、snapshot。

- [ ] **Step 1–4:** 测试（无规则/有规则摘要）→ 实现 → pytest → commit

```bash
git commit -am "feat: add catalog and lead APIs"
```

---

### Task 6: 管理端 CRUD API + 上传

**Files:**
- Create: `server/app/routes/admin_catalog.py`
- Create: `server/app/routes/admin_config.py`
- Create: `server/app/routes/admin_leads.py`
- Create: `server/app/routes/admin_upload.py`
- Create: `server/tests/test_admin_catalog.py`

覆盖：品类/种类/商品/费用 upsert 与 `fee_rule: null` 清除、configs、leads 筛选、upload 存 `UPLOAD_FOLDER` 返回 `/uploads/...`。

商品保存时：由 `sub_category_id` 强制写入正确 `category_id`。

- [ ] **Commit**

```bash
git commit -am "feat: add admin catalog config leads and upload APIs"
```

---

### Task 7: 改造 admin Web 调 Flask

**Files:**
- Modify: `admin/src/api/http.js`
- Modify: `admin/src/api/admin.js`
- Modify: `admin/src/stores/auth.js`
- Modify: `admin/.env.example` → `VITE_API_BASE=http://127.0.0.1:5000`
- Modify: 各 views 若字段名从 camelCase 云函数改为规格 snake_case / 响应 `code===0`

- [ ] **Step 1: http 封装**

```js
const BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000'

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.message || '请求失败')
  return json.data
}
```

- [ ] **Step 2: 登录改调 `POST /admin/auth/login`，CRUD 改调 §7.2 路径**

- [ ] **Step 3: 本机验证**

```bash
# terminal1
cd server && python run.py
# terminal2
cd admin && npm run dev
```

浏览器登录 admin / BOOTSTRAP 密码，建一条品类。

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: point admin web at Flask JWT APIs"
```

---

### Task 8: 改造小程序 HTTP 客户端与登录

**Files:**
- Create: `miniprogram/utils/http.js`
- Create: `miniprogram/utils/config.js`（`baseUrl`）
- Modify: `miniprogram/app.js`
- Modify: 所有 `require('../../utils/cloud')` → `http`
- Delete or stop using: `miniprogram/utils/cloud.js`

- [ ] **Step 1: config + http**

```js
// config.js
module.exports = {
  baseUrl: 'http://127.0.0.1:5000' // 真机改为电脑局域网 IP
}
```

```js
// http.js
const { baseUrl } = require('./config')

function request(path, { method = 'GET', data, auth = false } = {}) {
  const header = { 'content-type': 'application/json' }
  if (auth) {
    const token = wx.getStorageSync('token')
    if (token) header.Authorization = `Bearer ${token}`
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + path,
      method,
      data,
      header,
      success(res) {
        const body = res.data
        if (!body || body.code !== 0) {
          reject(new Error((body && body.message) || '请求失败'))
          return
        }
        resolve(body.data)
      },
      fail: reject
    })
  })
}

module.exports = { request }
```

- [ ] **Step 2: app.js ensureLogin**

`wx.login` → `POST /auth/wechat_login` → `wx.setStorageSync('token', ...)`；`openidReady` 在成功后 true。

- [ ] **Step 3: 页面改 API**

| 原 cloud | 新 HTTP |
|----------|---------|
| catalog home | `GET /catalog/home` |
| categories | `GET /catalog/categories` |
| products | `GET /catalog/products?...` |
| detail | `GET /catalog/products/:id` |
| article | `GET /catalog/article?type=` |
| lead create | `POST /leads` auth |
| lead mine | `GET /leads/mine` auth |

注意：服务端返回 snake_case 时，小程序 wxml 若仍用 `priceSummary` 需在适配层转 camelCase，或改 wxml 为 `price_summary`——**推荐在 http 适配函数里转成现有页面字段**，少改 UI。

- [ ] **Step 4: 开发者工具勾选「不校验合法域名」后点首页**

Expected：无 -601034；无数据时仍可显示「暂无推荐」（接口成功）。

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: switch miniprogram from cloud to Flask HTTP"
```

---

### Task 9: 文档与收尾

**Files:**
- Modify: `docs/ops/bootstrap.md`（Flask 启动，删云开发步骤）
- Modify: `README.md`
- Delete: `server/shared/` JS 费用文件（已由 Python 替代）或保留并注明 deprecated——**推荐删除避免双源**

- [ ] **Step 1: 重写 bootstrap 为 Flask + SQLite 本机流程**

- [ ] **Step 2: 全量 pytest**

```bash
cd server
pytest -v
```

Expected: 全部 PASS

- [ ] **Step 3: Commit + push**

```bash
git add -A
git commit -m "docs: bootstrap for Flask SQLite local stack"
git push origin master
```

---

## Spec coverage

| 规格项 | Task |
|--------|------|
| Flask+SQLite 骨架 | 1 |
| 费用公式 | 2 |
| 模型/bootstrap admin | 3 |
| 微信/管理登录、profile | 4 |
| catalog/leads C 端 | 5 |
| admin CRUD/upload/筛选 | 6 |
| admin Web | 7 |
| 小程序 HTTP | 8 |
| 废弃云函数 | 1 |
| 文档 | 9 |

## Placeholder scan

无 TBD；mock 微信与 baseUrl 本机值已写明。

## Type consistency

- 响应：`{code,message,data}`  
- JWT claims：`openid`, `role`  
- 询价状态：`new|contacted|won|closed`  
- 费用：`fixed_amount_fen`, `rate_bps`

---

Plan complete and saved to `docs/superpowers/plans/2026-08-29-haishi-flask-sqlite.md`. Two execution options:

**1. Subagent-Driven（推荐）** — 每 Task 独立子代理，做完再审  

**2. Inline Execution** — 本会话连续执行（不使用 worktree，直接在 master）

Which approach?
