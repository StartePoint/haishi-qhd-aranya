# 海拾阿那亚代购地 — Flask + SQLite 服务端与管理端设计

**日期：** 2026-08-29  
**状态：** 已确认（复刻李旺财 PetParadise 技术路线）  
**前置产品规格：** `docs/superpowers/specs/2026-08-29-haishi-anaya-daigou-design.md`（方案 A：橱窗 + 留资）  
**参考实现：** `E:\AIProject\liwangcai\PetParadise`（`pet_server` / `pet_web` / `pet_ui`）

## 1. 目标

将「海拾」从微信云开发切到与李旺财相同的本机可运行架构：

- **服务端**：Flask + SQLAlchemy + **SQLite** + JWT + CORS  
- **管理端 Web**：Vue 3 + Vite + Pinia，HTTP 调服务端  
- **小程序**：`wx.request` 调同一套 HTTP API（废弃云函数）

一期业务范围不变：品类/种类/商品/代购费/采购配置/留资询价；不做支付与购物车。

## 2. 目录结构（对齐李旺财三端）

```text
haishi-qhd-anaya/
├── miniprogram/          # 对标 pet_ui（保留现有页面，改请求层）
├── server/               # 对标 pet_server（重写为 Flask 应用，去掉 cloudfunctions）
│   ├── app/
│   │   ├── __init__.py          # create_app
│   │   ├── models/
│   │   ├── routes/              # C 端 + admin 蓝图
│   │   ├── services/            # 费用计算、微信登录等
│   │   ├── utils/               # JWT 装饰器、响应封装
│   │   └── extensions/          # 可选 limiter
│   ├── config/
│   │   ├── development.py
│   │   └── production.py
│   ├── data/development/        # sqlite 文件、上传目录
│   ├── tests/
│   ├── requirements.txt
│   ├── run.py
│   └── wsgi.py
├── admin/                # 对标 pet_web（在现有 Vue 上改为 JWT HTTP）
├── docs/
└── project.config.json   # 去掉或忽略 cloudfunctionRoot（小程序不再依赖云函数）
```

**处置现有云函数：**

- 删除或移入 `server/_legacy_cloudfunctions/`（实现阶段二选一；推荐删除并在本规格中声明废弃）  
- 小程序 `wx.cloud` 全部改为 HTTP  

## 3. 技术选型（复刻清单）

| 能力 | 李旺财 | 海拾一期 |
|------|--------|----------|
| Web 框架 | Flask 3 | 同 |
| ORM | Flask-SQLAlchemy | 同 |
| DB | SQLite 文件 | 同，`data/development/haishi.db` |
| 用户认证 | code → openid → JWT | 同，`POST /auth/wechat_login` |
| 管理认证 | 账号密码 → JWT（admin claims） | 同，`POST /admin/auth/login` |
| CORS | flask-cors | 同 |
| 管理端 | Vue3 + Vite + Pinia | 同（现有 admin 改造） |
| 本机启动 | `run.py` / localhost:5000 | 同（端口可配置，默认 5000） |
| 上传 | 本地 static/uploads | 同，商品图存本地并由 Flask 静态托管或 `/uploads/...` |

一期可不引入：APScheduler、Flasgger（可选开发环境开启）、MySQL、Gunicorn（本机开发不强制）。

## 4. 认证与请求约定

### 4.1 统一响应

```json
{ "code": 0, "message": "成功", "data": { } }
```

非 0 为业务/鉴权错误；HTTP 层尽量 200 + code（与李旺财习惯对齐），明显非法请求可用 4xx。

### 4.2 小程序登录

1. `wx.login` 得 `code`  
2. `POST /auth/wechat_login` `{ "code": "..." }`  
3. 服务端用 `WECHAT_APPID` + `WECHAT_SECRET` 调 `jscode2session` 得 `openid`  
4. 签发 JWT（claims 含 `openid`、`user_id`）  
5. 小程序本地存储 token；后续请求头：`Authorization: Bearer <token>`  

**开发兜底：** 当 `FLASK_ENV=development` 且配置 `WECHAT_MOCK_OPENID=1` 时，可用固定 mock openid 登录，便于无真机密钥联调（须在文档标明，生产禁止）。

### 4.3 管理端登录

- `POST /admin/auth/login` `{ username, password }`  
- 返回 JWT（claims 含 `role: admin`）  
- 管理接口装饰器：`@admin_required`  

### 4.4 留资与 openid

- 创建询价必须带用户 JWT；服务端强制写入 token 中的 openid  
- 不允许匿名留资（与产品规格一致）  

## 5. 数据模型（SQLite）

金额一律 **整数分**；百分比用 **rate_bps**（万分比，`1000` = 10%）。

### 5.1 `admins`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | PK | |
| username | str unique | |
| password_hash | str | werkzeug 哈希 |
| created_at | datetime | |

首次启动：若无管理员，用环境变量 `BOOTSTRAP_ADMIN_USER` / `BOOTSTRAP_ADMIN_PASSWORD` 创建（对标李旺财可种子数据）。

### 5.2 `categories` / `sub_categories` / `products`

与产品规格一致：

- category：name, icon, sort, enabled  
- sub_category：category_id FK, name, sort, enabled  
- product：category_id, sub_category_id（必填且 category 必须与种类父级一致）, name, cover, gallery_json, spec_text, detail_html, reference_price_fen, is_recommended, sort, on_sale  

### 5.3 `fee_rules`

| 字段 | 说明 |
|------|------|
| scope | `category` \| `product` |
| category_id / product_id | 按 scope 二选一 |
| type | `fixed` \| `percent` |
| fixed_amount_fen | |
| rate_bps | |

同一 scope+目标仅一条（保存时 upsert）。解析优先级：商品规则 > 品类规则 > 无规则（详询客服）。

### 5.4 `configs`

键值表：`key` unique, `value` text。键名与产品规格一致：  
`announcementTitle`, `announcementContent`, `nextPurchaseDate`, `cutoffText`, `customerWechat`, `customerWorkWechatUrl`, `guideText`, `aboutText`, `shippingNote`, `leadSuccessText`

### 5.5 `leads`

| 字段 | 说明 |
|------|------|
| openid | 强制服务端写入 |
| product_id | |
| contact_name, phone, wechat, qty, remark | |
| status | `new` \| `contacted` \| `won` \| `closed` |
| admin_remark | |
| snapshot_json | 商品名、参考价、按数量算的服务费等 |
| created_at, updated_at | |

同 openid 1 分钟内限流一条（应用层或 limiter）。

### 5.6 `users`（轻量）

| 字段 | 说明 |
|------|------|
| id | PK |
| openid | unique |
| nickname / avatar | 可选 |
| created_at | |

微信登录时 upsert。

## 6. 费用计算（服务端权威）

逻辑与现有 `server/shared/fee.js` 一致，Python 实现放在 `server/app/services/fee.py`：

- `calc_service_fee_fen(rule, reference_price_fen, qty)`  
- `build_price_summary(reference_price_fen, rule)`（qty=1）  
- 列表/详情价格一律 API 返回 `price_summary`，前端不重算  

保留或迁移 JS 测试思路：用 pytest 覆盖 fixed / percent / 无规则。

## 7. API 一览

前缀建议：无前缀或统一 `/api`（实现时与李旺财一致选一种；**推荐无额外前缀，蓝图自带路径**，如 `/auth/...`、`/admin/...`、`/catalog/...`）。

### 7.1 C 端（小程序）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/auth/wechat_login` | 无 | 登录 |
| GET | `/catalog/home` | 无 | 公告、采购日、推荐、客服微信号 |
| GET | `/catalog/categories` | 无 | 启用品类 |
| GET | `/catalog/products` | 无 | query: category_id, sub_category_id?, page |
| GET | `/catalog/products/<id>` | 无 | 详情 + 费用拆分 + 运费文案 |
| GET | `/catalog/article` | 无 | query: type=guide\|about |
| POST | `/leads` | 用户 JWT | 创建询价 |
| GET | `/leads/mine` | 用户 JWT | 我的询价 |

### 7.2 管理端

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/admin/auth/login` | 登录 |
| GET/POST | `/admin/categories` | 列表/创建 |
| PUT/PATCH | `/admin/categories/<id>` | 更新/启停 |
| GET/POST | `/admin/sub-categories` | 依赖 category_id |
| PUT | `/admin/sub-categories/<id>` | |
| GET/POST | `/admin/products` | |
| GET/PUT | `/admin/products/<id>` | 含 fee 覆盖 |
| PUT | `/admin/categories/<id>/fee-rule` | 品类默认费用 |
| GET/PUT | `/admin/configs` | 批量读写配置 |
| GET | `/admin/leads` | 筛选 status |
| PATCH | `/admin/leads/<id>` | 改 status / admin_remark |
| POST | `/admin/upload` | 图片上传，返回可访问 URL |

## 8. 管理端 Web（admin）改造

对齐 `pet_web`：

- `src/api/http.ts`（或 js）：baseURL 指向 `http://127.0.0.1:5000`，自动带 Bearer  
- `stores/auth`：存 JWT  
- 页面：登录、品类、种类、商品编辑（含费用）、询价、配置（可沿用现有 Vue 页面逻辑，换 API）  
- 开发环境 Vite proxy 可选：`/admin-api` → Flask  

## 9. 小程序改造要点

- 删除 `wx.cloud.init` 与云函数调用  
- `utils/cloud.js` 改为 `utils/http.js`：封装 `request` + token  
- `app.js`：启动时 `wx.login` → `/auth/wechat_login`  
- `project.config.json`：可移除 `cloudfunctionRoot` 或留空无关项  
- 本机调试：开发者工具勾选不校验合法域名；`baseUrl` 配本机 IP（真机）或 localhost（模拟器）

## 10. 配置与本机运行

`server/.env` 示例：

```env
FLASK_ENV=development
SECRET_KEY=dev-secret
JWT_SECRET_KEY=dev-jwt-secret
WECHAT_APPID=
WECHAT_SECRET=
WECHAT_MOCK_OPENID=1
BOOTSTRAP_ADMIN_USER=admin
BOOTSTRAP_ADMIN_PASSWORD=change-me-now
DATABASE_URL=sqlite:///data/development/haishi.db
```

启动：

```bash
cd server
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

默认 `http://127.0.0.1:5000`。

## 11. 与旧云开发规格的关系

| 项 | 处理 |
|----|------|
| 产品功能（橱窗+留资） | **不变**，仍以 `2026-08-29-haishi-anaya-daigou-design.md` 为准 |
| 云开发 / 云函数 | **废弃**，由本规格替代技术架构章节 |
| 费用公式 / 询价状态 / 配置键 | **不变** |

## 12. 一期交付验收

1. 本机 Flask + SQLite 可启动，管理员可登录 Web  
2. Web 可完成品类→种类→商品→费用→上架与配置  
3. 小程序可浏览首页/分类/详情费用，可登录并留资  
4. 管理端可见询价并改状态  
5. 无云开发依赖即可完成上述路径  

## 13. 明确不做（本规格）

- 复制李旺财业务（预约、狗证、套餐卡等）  
- MySQL / 生产 Nginx / Gunicorn 部署细节（可二期参考 `pet_server/server/server.md`）  
- 微信支付、购物车  
