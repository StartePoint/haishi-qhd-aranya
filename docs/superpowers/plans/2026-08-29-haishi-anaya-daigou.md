# 海拾阿那亚代购地（方案 A）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付「橱窗 + 费用拆分 + 留资」微信小程序与 Vue 3 管理端，经微信云开发读写品类/商品/费用/询价。

**Architecture:** 原生小程序（C 端）+ Vue 3 管理端（Web）+ 云函数统一业务与鉴权；费用计算放在可单测的共享纯函数中，列表/详情价格一律由服务端算好返回。数据库集合：`categories`、`sub_categories`、`products`、`fee_rules`、`leads`、`configs`、`admins`。

**Tech Stack:** 微信小程序原生、微信云开发（云函数 Node.js 16+）、Vue 3 + Vite + Element Plus、Jest（费用与规则单测）、云存储（商品图）

**Spec:** `docs/superpowers/specs/2026-08-29-haishi-anaya-daigou-design.md`

---

## File Structure

```text
haishi-qhd-anaya/
├── project.config.json              # 小程序 + 云函数根配置
├── miniprogram/
│   ├── app.js / app.json / app.wxss
│   ├── utils/cloud.js               # 云函数调用封装
│   ├── utils/format.js              # 分→元展示
│   ├── pages/home/index.*
│   ├── pages/category/index.*
│   ├── pages/product/detail.*
│   ├── pages/mine/index.*
│   ├── pages/mine/leads.*
│   ├── pages/mine/article.*         # 代购须知 / 关于我们
│   └── components/product-card/
├── admin/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── router/index.js
│       ├── api/http.js
│       ├── api/admin.js
│       ├── stores/auth.js
│       └── views/
│           ├── Login.vue
│           ├── Categories.vue
│           ├── SubCategories.vue
│           ├── Products.vue
│           ├── ProductEdit.vue
│           ├── Leads.vue
│           └── Configs.vue
├── cloudfunctions/
│   ├── common/                      # 云函数公共模块（部署时拷贝或用 npm）
│   │   ├── fee.js
│   │   ├── money.js
│   │   ├── auth.js
│   │   └── respond.js
│   ├── login/                       # C 端：确保 openid 会话可用
│   ├── catalog/                     # C 端：首页/分类/详情（含算费）
│   ├── lead/                        # C 端：创建询价、我的询价
│   ├── adminAuth/                   # 管理端登录 / 校验 token
│   ├── adminCatalog/                # 管理端品类/种类/商品/费用
│   ├── adminLead/                   # 管理端询价
│   ├── adminConfig/                 # 管理端配置
│   └── seedAdmin/                   # 一次性写入首个管理员（可部署后删）
└── shared/                          # 本地单测用，与 cloudfunctions/common/fee.js 同源
    ├── fee.js
    ├── money.js
    └── package.json                 # jest
```

**依赖方向：** `pages/views → api/utils → cloudfunctions → common(fee)`；费用公式只维护一处（`shared/fee.js` 与 `cloudfunctions/common/fee.js` 保持内容一致，Task 2 用复制或同步脚本）。

---

### Task 1: 仓库脚手架（小程序 + 云开发配置）

**Files:**
- Create: `project.config.json`
- Create: `miniprogram/app.js`
- Create: `miniprogram/app.json`
- Create: `miniprogram/app.wxss`
- Create: `miniprogram/sitemap.json`
- Create: `.gitignore`

- [ ] **Step 1: 写入 `.gitignore`**

```gitignore
node_modules/
admin/dist/
miniprogram_npm/
.DS_Store
*.log
.env
.env.*
.idea/
.vscode/
```

- [ ] **Step 2: 写入 `project.config.json`**

```json
{
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "setting": {
    "es6": true,
    "minified": true
  },
  "appid": "touristappid",
  "compileType": "miniprogram",
  "cloudfunctionTemplateRoot": "",
  "condition": {}
}
```

说明：实现时把 `appid` 换成真实 AppID；本地可用测试号。

- [ ] **Step 3: 写入小程序入口**

`miniprogram/app.json`:

```json
{
  "pages": [
    "pages/home/index",
    "pages/category/index",
    "pages/product/detail",
    "pages/mine/index",
    "pages/mine/leads",
    "pages/mine/article"
  ],
  "window": {
    "navigationBarTitleText": "海拾阿那亚代购地",
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#f5f5f5"
  },
  "tabBar": {
    "color": "#666666",
    "selectedColor": "#c45c26",
    "list": [
      {
        "pagePath": "pages/home/index",
        "text": "首页"
      },
      {
        "pagePath": "pages/category/index",
        "text": "分类"
      },
      {
        "pagePath": "pages/mine/index",
        "text": "我的"
      }
    ]
  },
  "sitemapLocation": "sitemap.json",
  "lazyCodeLoading": "requiredComponents"
}
```

`miniprogram/app.js`:

```js
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上基础库以使用云能力')
      return
    }
    wx.cloud.init({
      // env: 'your-env-id',
      traceUser: true
    })
    this.ensureLogin()
  },
  globalData: {
    openidReady: false
  },
  ensureLogin() {
    return wx.cloud
      .callFunction({ name: 'login' })
      .then(() => {
        this.globalData.openidReady = true
      })
      .catch((err) => {
        console.error('login failed', err)
        this.globalData.openidReady = false
      })
  }
})
```

`miniprogram/app.wxss`:

```css
page {
  background: #f5f5f5;
  color: #222;
  font-size: 28rpx;
}
```

`miniprogram/sitemap.json`:

```json
{
  "desc": "海拾阿那亚代购地",
  "rules": [{ "action": "allow", "page": "*" }]
}
```

- [ ] **Step 4: 创建占位页面目录**（后续 Task 填满）

为 `app.json` 中每个 page 创建最小 `index.js` / `index.json` / `index.wxml` / `index.wxss`（product 用 `detail.*`），内容为单页标题即可，保证开发者工具能编译。

- [ ] **Step 5: Commit**

```bash
git add .gitignore project.config.json miniprogram
git commit -m "chore: scaffold WeChat miniprogram project"
```

---

### Task 2: 费用纯函数 + Jest

**Files:**
- Create: `shared/package.json`
- Create: `shared/money.js`
- Create: `shared/fee.js`
- Create: `shared/fee.test.js`
- Create: `cloudfunctions/common/money.js`（与 shared 相同）
- Create: `cloudfunctions/common/fee.js`（与 shared 相同）

- [ ] **Step 1: 写入 `shared/package.json`**

```json
{
  "name": "haishi-shared",
  "private": true,
  "scripts": {
    "test": "node --test fee.test.js"
  }
}
```

使用 Node 内置 test runner（Node 18+）。若环境为 Node 16，改为安装 `jest` 并改脚本。

- [ ] **Step 2: 写入金额工具**

`shared/money.js`:

```js
function fenToYuanText(fen) {
  const n = Number(fen) || 0
  return (n / 100).toFixed(2)
}

module.exports = { fenToYuanText }
```

- [ ] **Step 3: 写失败测试**

`shared/fee.test.js`:

```js
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { calcServiceFeeFen, buildPriceSummary } = require('./fee')

describe('calcServiceFeeFen', () => {
  it('fixed per piece', () => {
    assert.equal(
      calcServiceFeeFen({ type: 'fixed', fixedAmountFen: 500 }, 4800, 2),
      1000
    )
  })
  it('percent with rateBps rounding', () => {
    // 10% of 999 fen = 99.9 -> 100
    assert.equal(
      calcServiceFeeFen({ type: 'percent', rateBps: 1000 }, 999, 1),
      100
    )
  })
  it('returns null when no rule', () => {
    assert.equal(calcServiceFeeFen(null, 1000, 1), null)
  })
})

describe('buildPriceSummary', () => {
  it('with rule shows total and lines', () => {
    const s = buildPriceSummary(4800, { type: 'fixed', fixedAmountFen: 500 })
    assert.equal(s.referenceFen, 4800)
    assert.equal(s.serviceFeeFen, 500)
    assert.equal(s.totalFen, 5300)
    assert.equal(s.askServiceFee, false)
    assert.match(s.mainText, /约 ¥53\.00/)
  })
  it('without rule asks客服', () => {
    const s = buildPriceSummary(4800, null)
    assert.equal(s.serviceFeeFen, null)
    assert.equal(s.totalFen, 4800)
    assert.equal(s.askServiceFee, true)
    assert.equal(s.subText, '服务费详询客服')
  })
})
```

- [ ] **Step 4: 运行确认失败**

```bash
cd shared && node --test fee.test.js
```

Expected: FAIL（module not found 或函数未定义）

- [ ] **Step 5: 实现 `shared/fee.js`**

```js
const { fenToYuanText } = require('./money')

function calcServiceFeeFen(rule, referencePriceFen, qty) {
  if (!rule || !rule.type) return null
  const q = Math.max(1, Number(qty) || 1)
  const ref = Number(referencePriceFen) || 0
  if (rule.type === 'fixed') {
    return (Number(rule.fixedAmountFen) || 0) * q
  }
  if (rule.type === 'percent') {
    const rateBps = Number(rule.rateBps) || 0
    return Math.round((ref * rateBps) / 10000) * q
  }
  return null
}

function ruleLabel(rule) {
  if (!rule) return '详询客服'
  if (rule.type === 'fixed') {
    return `代购服务费 ¥${fenToYuanText(rule.fixedAmountFen)}/件`
  }
  if (rule.type === 'percent') {
    const pct = ((Number(rule.rateBps) || 0) / 100).toFixed(2)
    return `代购服务费 ${pct}%`
  }
  return '详询客服'
}

/** 列表/详情均按 qty=1 */
function buildPriceSummary(referencePriceFen, rule) {
  const referenceFen = Number(referencePriceFen) || 0
  const serviceFeeFen = calcServiceFeeFen(rule, referenceFen, 1)
  if (serviceFeeFen === null) {
    return {
      referenceFen,
      serviceFeeFen: null,
      totalFen: referenceFen,
      askServiceFee: true,
      mainText: `约 ¥${fenToYuanText(referenceFen)}`,
      subText: '服务费详询客服',
      ruleLabel: '详询客服'
    }
  }
  const totalFen = referenceFen + serviceFeeFen
  return {
    referenceFen,
    serviceFeeFen,
    totalFen,
    askServiceFee: false,
    mainText: `约 ¥${fenToYuanText(totalFen)}`,
    subText: `参考价 ¥${fenToYuanText(referenceFen)} · 服务费 ¥${fenToYuanText(serviceFeeFen)}`,
    ruleLabel: ruleLabel(rule)
  }
}

function resolveRule(productRule, categoryRule) {
  return productRule || categoryRule || null
}

module.exports = {
  calcServiceFeeFen,
  buildPriceSummary,
  resolveRule,
  ruleLabel
}
```

- [ ] **Step 6: 再跑测试**

```bash
cd shared && node --test fee.test.js
```

Expected: PASS

- [ ] **Step 7: 复制到云函数 common**

将 `money.js`、`fee.js` 复制到 `cloudfunctions/common/`（内容一致）。

- [ ] **Step 8: Commit**

```bash
git add shared cloudfunctions/common
git commit -m "feat: add fee calculation pure functions with tests"
```

---

### Task 3: 云函数公共响应与管理员鉴权辅助

**Files:**
- Create: `cloudfunctions/common/respond.js`
- Create: `cloudfunctions/common/auth.js`

- [ ] **Step 1: `respond.js`**

```js
function ok(data) {
  return { ok: true, data }
}
function fail(code, message) {
  return { ok: false, code, message }
}
module.exports = { ok, fail }
```

- [ ] **Step 2: `auth.js`**

```js
const cloud = require('wx-server-sdk')
const crypto = require('crypto')

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')
}

function createToken() {
  return crypto.randomBytes(24).toString('hex')
}

async function requireAdmin(db, token) {
  if (!token) return null
  const res = await db.collection('admins').where({ token }).limit(1).get()
  const admin = res.data[0]
  if (!admin) return null
  if (admin.tokenExpireAt && admin.tokenExpireAt < Date.now()) return null
  return admin
}

function getOpenId() {
  const wxContext = cloud.getWXContext()
  return wxContext.OPENID || ''
}

module.exports = { hashPassword, createToken, requireAdmin, getOpenId }
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/common
git commit -m "feat: add cloud common respond and admin auth helpers"
```

---

### Task 4: `login` 与 `seedAdmin` 云函数

**Files:**
- Create: `cloudfunctions/login/index.js`
- Create: `cloudfunctions/login/package.json`
- Create: `cloudfunctions/seedAdmin/index.js`
- Create: `cloudfunctions/seedAdmin/package.json`

- [ ] **Step 1: `login`**

`package.json`:

```json
{
  "name": "login",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": { "wx-server-sdk": "~2.6.3" }
}
```

`index.js`:

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const { ok, fail } = require('../common/respond')
const { getOpenId } = require('../common/auth')

exports.main = async () => {
  const openid = getOpenId()
  if (!openid) return fail('NO_OPENID', '无法获取用户身份')
  return ok({ openid })
}
```

注意：微信云开发默认**不会**自动打包 `../common`。实现时二选一：

1. 每个云函数目录内放 `common` 拷贝；或  
2. 用云函数「本地依赖 / 文件层」按官方文档配置。

本计划默认：**部署前脚本把 `cloudfunctions/common` 复制进各函数目录**。Task 4 末尾增加 `scripts/sync-common.js`。

- [ ] **Step 2: `seedAdmin`（一次性）**

```js
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('../common/respond')
const { hashPassword } = require('../common/auth')

exports.main = async (event) => {
  const { username = 'admin', password, setupKey } = event
  if (setupKey !== process.env.SETUP_KEY && setupKey !== 'haishi-init-once') {
    return fail('FORBIDDEN', 'setupKey 无效')
  }
  if (!password || String(password).length < 8) {
    return fail('BAD_PASSWORD', '密码至少 8 位')
  }
  const exist = await db.collection('admins').where({ username }).count()
  if (exist.total > 0) return fail('EXISTS', '管理员已存在')
  const salt = crypto.randomBytes(16).toString('hex')
  await db.collection('admins').add({
    data: {
      username,
      salt,
      passwordHash: hashPassword(password, salt),
      token: '',
      tokenExpireAt: 0,
      createdAt: Date.now()
    }
  })
  return ok({ username })
}
```

- [ ] **Step 3: `scripts/sync-common.js`**

```js
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..', 'cloudfunctions')
const commonSrc = path.join(root, 'common')
const targets = fs.readdirSync(root).filter((n) => {
  const p = path.join(root, n)
  return n !== 'common' && fs.statSync(p).isDirectory()
})
for (const t of targets) {
  const dest = path.join(root, t, 'common')
  fs.cpSync(commonSrc, dest, { recursive: true })
  console.log('synced common ->', t)
}
```

运行：`node scripts/sync-common.js`

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/login cloudfunctions/seedAdmin scripts
git commit -m "feat: add login and seedAdmin cloud functions"
```

---

### Task 5: `catalog` 云函数（C 端读）

**Files:**
- Create: `cloudfunctions/catalog/index.js`
- Create: `cloudfunctions/catalog/package.json`

行为：`event.action` = `home` | `categories` | `products` | `detail`

- [ ] **Step 1: 实现 `catalog/index.js` 核心逻辑**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { ok, fail } = require('./common/respond')
const { buildPriceSummary, resolveRule } = require('./common/fee')

async function getConfigMap() {
  const res = await db.collection('configs').limit(100).get()
  const map = {}
  res.data.forEach((row) => {
    map[row.key] = row.value
  })
  return map
}

async function loadRulesFor(categoryId, productId) {
  const res = await db
    .collection('fee_rules')
    .where(
      _.or([
        { scope: 'category', categoryId },
        { scope: 'product', productId }
      ])
    )
    .get()
  let categoryRule = null
  let productRule = null
  res.data.forEach((r) => {
    if (r.scope === 'product' && r.productId === productId) productRule = r
    if (r.scope === 'category' && r.categoryId === categoryId) categoryRule = r
  })
  return resolveRule(productRule, categoryRule)
}

async function home() {
  const cfg = await getConfigMap()
  const cats = await db
    .collection('categories')
    .where({ enabled: true })
    .orderBy('sort', 'asc')
    .get()
  const enabledCatIds = cats.data.map((c) => c._id)
  const prodRes = await db
    .collection('products')
    .where({
      onSale: true,
      isRecommended: true,
      categoryId: _.in(enabledCatIds.length ? enabledCatIds : ['__none__'])
    })
    .orderBy('sort', 'asc')
    .limit(10)
    .get()
  const items = []
  for (const p of prodRes.data) {
    const rule = await loadRulesFor(p.categoryId, p._id)
    items.push({
      id: p._id,
      name: p.name,
      cover: p.cover,
      priceSummary: buildPriceSummary(p.referencePriceFen, rule)
    })
  }
  return ok({
    announcementTitle: cfg.announcementTitle || '',
    announcementContent: cfg.announcementContent || '',
    nextPurchaseDate: cfg.nextPurchaseDate || '',
    cutoffText: cfg.cutoffText || '',
    recommended: items
  })
}

async function categories() {
  const res = await db
    .collection('categories')
    .where({ enabled: true })
    .orderBy('sort', 'asc')
    .get()
  return ok({
    list: res.data.map((c) => ({
      id: c._id,
      name: c.name,
      icon: c.icon || ''
    }))
  })
}

async function products(event) {
  const { categoryId, subCategoryId, page = 1, pageSize = 20 } = event
  if (!categoryId) return fail('BAD_REQUEST', '缺少 categoryId')
  const cat = await db.collection('categories').doc(categoryId).get()
  if (!cat.data || !cat.data.enabled) return ok({ list: [], total: 0 })

  const subs = await db
    .collection('sub_categories')
    .where({ categoryId, enabled: true })
    .orderBy('sort', 'asc')
    .get()

  const where = { categoryId, onSale: true }
  if (subCategoryId) where.subCategoryId = subCategoryId

  const countRes = await db.collection('products').where(where).count()
  const listRes = await db
    .collection('products')
    .where(where)
    .orderBy('sort', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  const list = []
  for (const p of listRes.data) {
    const rule = await loadRulesFor(p.categoryId, p._id)
    list.push({
      id: p._id,
      name: p.name,
      cover: p.cover,
      priceSummary: buildPriceSummary(p.referencePriceFen, rule)
    })
  }
  return ok({
    subCategories: [
      { id: '', name: '全部' },
      ...subs.data.map((s) => ({ id: s._id, name: s.name }))
    ],
    list,
    total: countRes.total
  })
}

async function detail(event) {
  const { productId } = event
  if (!productId) return fail('BAD_REQUEST', '缺少 productId')
  const prod = await db.collection('products').doc(productId).get()
  const p = prod.data
  if (!p || !p.onSale) return fail('NOT_FOUND', '商品不存在或已下架')
  const cat = await db.collection('categories').doc(p.categoryId).get()
  if (!cat.data || !cat.data.enabled) return fail('NOT_FOUND', '商品不可见')

  const rule = await loadRulesFor(p.categoryId, p._id)
  const priceSummary = buildPriceSummary(p.referencePriceFen, rule)
  const cfg = await getConfigMap()
  return ok({
    id: p._id,
    name: p.name,
    cover: p.cover,
    gallery: p.gallery || [],
    specText: p.specText || '',
    detailHtml: p.detailHtml || '',
    priceSummary,
    shippingNote: cfg.shippingNote || '',
    customerWechat: cfg.customerWechat || '',
    customerWorkWechatUrl: cfg.customerWorkWechatUrl || '',
    leadSuccessText: cfg.leadSuccessText || '将在 24 小时内联系您'
  })
}

exports.main = async (event) => {
  const action = event.action
  if (action === 'home') return home()
  if (action === 'categories') return categories()
  if (action === 'products') return products(event)
  if (action === 'detail') return detail(event)
  return fail('BAD_ACTION', '未知 action')
}
```

- [ ] **Step 2: sync-common + 在开发者工具上传 `catalog`**

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/catalog
git commit -m "feat: add catalog cloud function for C-end reads"
```

---

### Task 6: `lead` 云函数

**Files:**
- Create: `cloudfunctions/lead/index.js`
- Create: `cloudfunctions/lead/package.json`

- [ ] **Step 1: 实现创建与列表**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./common/respond')
const { getOpenId } = require('./common/auth')
const { calcServiceFeeFen, resolveRule, buildPriceSummary } = require('./common/fee')

const PHONE_RE = /^1\d{10}$/

async function loadRulesFor(categoryId, productId) {
  const _ = db.command
  const res = await db
    .collection('fee_rules')
    .where(
      _.or([
        { scope: 'category', categoryId },
        { scope: 'product', productId }
      ])
    )
    .get()
  let categoryRule = null
  let productRule = null
  res.data.forEach((r) => {
    if (r.scope === 'product' && r.productId === productId) productRule = r
    if (r.scope === 'category' && r.categoryId === categoryId) categoryRule = r
  })
  return resolveRule(productRule, categoryRule)
}

async function create(event) {
  const openid = getOpenId()
  if (!openid) return fail('NO_OPENID', '登录后才能提交')

  const { productId, contactName, phone, wechat = '', qty = 1, remark = '' } = event
  if (!productId || !contactName || !phone) return fail('BAD_REQUEST', '请填写必填项')
  if (!PHONE_RE.test(String(phone))) return fail('BAD_PHONE', '手机号格式不正确')
  const quantity = Math.floor(Number(qty) || 0)
  if (quantity < 1) return fail('BAD_QTY', '数量至少为 1')

  const recent = await db
    .collection('leads')
    .where({ openid })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  if (recent.data[0] && Date.now() - recent.data[0].createdAt < 60 * 1000) {
    return fail('RATE_LIMIT', '提交过于频繁，请稍后再试')
  }

  const prod = await db.collection('products').doc(productId).get()
  const p = prod.data
  if (!p || !p.onSale) return fail('NOT_FOUND', '商品不可代购')

  const rule = await loadRulesFor(p.categoryId, p._id)
  const unitSummary = buildPriceSummary(p.referencePriceFen, rule)
  const serviceFeeFen =
    calcServiceFeeFen(rule, p.referencePriceFen, quantity)

  await db.collection('leads').add({
    data: {
      openid,
      productId: p._id,
      contactName: String(contactName).trim(),
      phone: String(phone).trim(),
      wechat: String(wechat).trim(),
      qty: quantity,
      remark: String(remark).trim(),
      status: 'new',
      adminRemark: '',
      snapshot: {
        name: p.name,
        referencePriceFen: p.referencePriceFen,
        serviceFeeFen,
        unitServiceFeeFen: unitSummary.serviceFeeFen,
        askServiceFee: unitSummary.askServiceFee
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  })

  const cfg = await db.collection('configs').where({ key: 'leadSuccessText' }).limit(1).get()
  const leadSuccessText =
    (cfg.data[0] && cfg.data[0].value) || '将在 24 小时内联系您'
  return ok({ leadSuccessText })
}

async function mine() {
  const openid = getOpenId()
  if (!openid) return fail('NO_OPENID', '请先登录')
  const res = await db
    .collection('leads')
    .where({ openid })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()
  return ok({
    list: res.data.map((l) => ({
      id: l._id,
      status: l.status,
      qty: l.qty,
      createdAt: l.createdAt,
      productName: l.snapshot && l.snapshot.name,
      snapshot: l.snapshot
    }))
  })
}

exports.main = async (event) => {
  if (event.action === 'create') return create(event)
  if (event.action === 'mine') return mine()
  return fail('BAD_ACTION', '未知 action')
}
```

状态枚举字符串：`new` | `contacted` | `won` | `closed`（对应用户文案：新询价/已沟通/已成交/已关闭）。

- [ ] **Step 2: Commit**

```bash
git add cloudfunctions/lead
git commit -m "feat: add lead create and mine cloud function"
```

---

### Task 7: 管理端云函数 `adminAuth` / `adminCatalog` / `adminLead` / `adminConfig`

**Files:**
- Create: `cloudfunctions/adminAuth/index.js` + `package.json`
- Create: `cloudfunctions/adminCatalog/index.js` + `package.json`
- Create: `cloudfunctions/adminLead/index.js` + `package.json`
- Create: `cloudfunctions/adminConfig/index.js` + `package.json`

管理端通过 HTTP 触发或小程序云开发 Web 控制台调用均可。推荐：**云函数 HTTP 访问服务** 或管理端用 `@cloudbase/js-sdk` 以自定义登录。一期简化：

**一期约定：** 管理端 Vite 开发时，用云开发 Web SDK（匿名关闭），通过调用云函数并在 `event.token` 传管理员 token；云函数内 `requireAdmin`。管理端登录页调 `adminAuth.login` 拿 token 存 `localStorage`。

- [ ] **Step 1: `adminAuth`**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./common/respond')
const { hashPassword, createToken, requireAdmin } = require('./common/auth')

async function login(event) {
  const { username, password } = event
  const res = await db.collection('admins').where({ username }).limit(1).get()
  const admin = res.data[0]
  if (!admin) return fail('AUTH', '账号或密码错误')
  const hash = hashPassword(password, admin.salt)
  if (hash !== admin.passwordHash) return fail('AUTH', '账号或密码错误')
  const token = createToken()
  const tokenExpireAt = Date.now() + 7 * 24 * 3600 * 1000
  await db.collection('admins').doc(admin._id).update({
    data: { token, tokenExpireAt }
  })
  return ok({ token, username: admin.username, expireAt: tokenExpireAt })
}

async function me(event) {
  const admin = await requireAdmin(db, event.token)
  if (!admin) return fail('UNAUTHORIZED', '请重新登录')
  return ok({ username: admin.username })
}

exports.main = async (event) => {
  if (event.action === 'login') return login(event)
  if (event.action === 'me') return me(event)
  return fail('BAD_ACTION', '未知 action')
}
```

- [ ] **Step 2: `adminCatalog` 关键 action**

实现并在注释/路由中覆盖：

| action | 行为 |
|--------|------|
| `listCategories` / `saveCategory` / `setCategoryEnabled` | 品类 |
| `listSubCategories` / `saveSubCategory` / `setSubCategoryEnabled` | 种类；保存时校验 `categoryId` |
| `listProducts` / `getProduct` / `saveProduct` | 商品；`subCategoryId` 必填；保存时读种类并强制 `categoryId = sub.categoryId` |
| `saveFeeRule` / `getFeeRules` | `scope: category\|product`；同 scope+目标仅保留一条（先删后增或 upsert） |
| `upload` | 可选：返回云存储 fileID（也可用前端直传） |

`saveProduct` 字段：`name, cover, gallery, specText, detailHtml, subCategoryId, referencePriceFen, isRecommended, sort, onSale`。

- [ ] **Step 3: `adminLead`**

- `list`：筛选 `status`、时间范围  
- `updateStatus`：`status` + `adminRemark`

- [ ] **Step 4: `adminConfig`**

- `getAll` / `setMany`  
键：`announcementTitle`, `announcementContent`, `nextPurchaseDate`, `cutoffText`, `customerWechat`, `customerWorkWechatUrl`, `guideText`, `aboutText`, `shippingNote`, `leadSuccessText`

`configs` 文档形状：`{ key, value, updatedAt }`，`key` 唯一。

- [ ] **Step 5: 数据库权限**

在云开发控制台将业务集合默认权限设为：**仅管理端云函数可写**；C 端不直连写库。`leads` 不开放客户端 create（一律云函数）。

- [ ] **Step 6: Commit**

```bash
git add cloudfunctions/adminAuth cloudfunctions/adminCatalog cloudfunctions/adminLead cloudfunctions/adminConfig
git commit -m "feat: add admin cloud functions for catalog leads and config"
```

---

### Task 8: 小程序工具与首页

**Files:**
- Create: `miniprogram/utils/cloud.js`
- Create: `miniprogram/utils/format.js`
- Modify: `miniprogram/pages/home/index.js|wxml|wxss|json`

- [ ] **Step 1: `utils/cloud.js`**

```js
function call(name, data = {}) {
  return wx.cloud.callFunction({ name, data }).then((res) => {
    const body = res.result
    if (!body || body.ok !== true) {
      const err = new Error((body && body.message) || '请求失败')
      err.code = body && body.code
      throw err
    }
    return body.data
  })
}

module.exports = { call }
```

- [ ] **Step 2: 实现首页**

加载 `catalog` `action: 'home'`，展示品牌标题、公告条、采购提醒、推荐列表；点推荐进 `pages/product/detail?id=`；「代购须知」进 `pages/mine/article?type=guide`。

- [ ] **Step 3: 开发者工具手动验证**

Expected：无数据时页面不白屏；有 configs/推荐时字段正确。

- [ ] **Step 4: Commit**

```bash
git add miniprogram/utils miniprogram/pages/home
git commit -m "feat: implement miniprogram home page"
```

---

### Task 9: 分类页 + 商品卡片组件

**Files:**
- Create: `miniprogram/components/product-card/*`
- Modify: `miniprogram/pages/category/index.*`

- [ ] **Step 1: `product-card` 展示 `priceSummary.mainText` / `subText`**

- [ ] **Step 2: 分类页**

1. `catalog.categories` 拉左侧  
2. 选中品类后 `catalog.products`  
3. 顶栏种类含「全部」  
4. 分页：`onReachBottom` 增加 `page`

- [ ] **Step 3: Commit**

```bash
git add miniprogram/components/product-card miniprogram/pages/category
git commit -m "feat: implement category browse with product cards"
```

---

### Task 10: 商品详情 + 留资弹层

**Files:**
- Modify: `miniprogram/pages/product/detail.*`

- [ ] **Step 1: 详情展示费用拆分（qty=1）**

行项目：参考价、服务费（或详询客服）、运费说明、合计说明。

- [ ] **Step 2: 「我想代购」表单**

字段同 spec；提交前：

```js
const app = getApp()
if (!app.globalData.openidReady) {
  await app.ensureLogin()
}
if (!app.globalData.openidReady) {
  wx.showToast({ title: '登录后才能提交', icon: 'none' })
  return
}
```

调用 `lead` `action: 'create'`，成功 toast `leadSuccessText`。

- [ ] **Step 3: 复制客服微信**

`wx.setClipboardData({ data: customerWechat })`

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/product
git commit -m "feat: product detail with fee breakdown and lead form"
```

---

### Task 11: 我的 / 询价列表 / 文章页

**Files:**
- Modify: `miniprogram/pages/mine/index.*`
- Modify: `miniprogram/pages/mine/leads.*`
- Modify: `miniprogram/pages/mine/article.*`

- [ ] **Step 1: 我的** — 客服、询价入口、须知、关于我们；可选 `wx.getUserProfile` 展示昵称（失败则用默认「海拾用户」）

- [ ] **Step 2: 询价列表** — `lead.mine`；状态映射中文

- [ ] **Step 3: article** — `type=guide|about`，从 `catalog.home` 已带或单独 `adminConfig` 对 C 端只读：可在 `catalog` 增加 `action: 'article'` 返回 `guideText`/`aboutText`，避免管理写接口暴露。

在 `catalog` 增加：

```js
async function article(event) {
  const cfg = await getConfigMap()
  if (event.type === 'about') return ok({ title: '关于我们', content: cfg.aboutText || '' })
  return ok({ title: '代购须知', content: cfg.guideText || '' })
}
```

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/mine cloudfunctions/catalog
git commit -m "feat: mine pages leads and articles"
```

---

### Task 12: Vue 3 管理端脚手架与登录

**Files:**
- Create: `admin/package.json`
- Create: `admin/vite.config.js`
- Create: `admin/index.html`
- Create: `admin/src/main.js`
- Create: `admin/src/App.vue`
- Create: `admin/src/router/index.js`
- Create: `admin/src/api/http.js`
- Create: `admin/src/stores/auth.js`
- Create: `admin/src/views/Login.vue`

- [ ] **Step 1: 初始化**

```bash
cd admin
npm create vite@latest . -- --template vue
npm install element-plus vue-router pinia @cloudbase/js-sdk
```

- [ ] **Step 2: 封装调用云函数**

`http.js` 使用 cloudbase JS SDK `app.callFunction`，自动附带 `token`。

- [ ] **Step 3: Login.vue** 调 `adminAuth` `login`，成功跳转品类页。

- [ ] **Step 4: Commit**

```bash
git add admin
git commit -m "feat: scaffold Vue admin with login"
```

---

### Task 13: 管理端品类 / 种类 / 商品 / 费用

**Files:**
- Create: `admin/src/views/Categories.vue`
- Create: `admin/src/views/SubCategories.vue`
- Create: `admin/src/views/Products.vue`
- Create: `admin/src/views/ProductEdit.vue`
- Create: `admin/src/api/admin.js`

- [ ] **Step 1: Categories** — 表格 + 新建/编辑名称、排序、启用开关

- [ ] **Step 2: SubCategories** — 先选品类再维护种类

- [ ] **Step 3: Products 列表** — 筛选品类、上下架、推荐标记

- [ ] **Step 4: ProductEdit** — 表单；选种类后只读展示自动带出的品类；参考价输入「元」提交时 `Math.round(yuan * 100)`；费用区可选「继承品类」或「商品覆盖（固定/比例）」

- [ ] **Step 5: 手动验收**

品类→种类→商品→费用→上架后，小程序分类页可见且价格摘要正确。

- [ ] **Step 6: Commit**

```bash
git add admin/src
git commit -m "feat: admin CRUD for categories products and fees"
```

---

### Task 14: 管理端询价单 + 系统配置

**Files:**
- Create: `admin/src/views/Leads.vue`
- Create: `admin/src/views/Configs.vue`

- [ ] **Step 1: Leads** — 列表、状态筛选、改状态、备注；展示 snapshot

- [ ] **Step 2: Configs** — 表单编辑全部配置键；保存 `setMany`

- [ ] **Step 3: 验收**

改 `nextPurchaseDate` 后首页采购提醒更新；用户留资后后台可见并可改状态。

- [ ] **Step 4: Commit**

```bash
git add admin/src/views/Leads.vue admin/src/views/Configs.vue
git commit -m "feat: admin leads and system configs"
```

---

### Task 15: 初始化数据与端到端验收

**Files:**
- Create: `docs/ops/bootstrap.md`（操作说明，非用户产品文档以外的运维备忘）

- [ ] **Step 1: 写 `docs/ops/bootstrap.md`**

内容包含：

1. 开通云开发环境，填写 `app.js` / admin 的 envId  
2. `node scripts/sync-common.js`  
3. 上传全部云函数  
4. 调用 `seedAdmin` 创建管理员  
5. 集合索引：`leads.openid + createdAt`；`products.categoryId + onSale + sort`  
6. 安全规则：全集合仅云函数可写  

- [ ] **Step 2: 对照 spec §9 验收清单打勾**

1. 管理端品类→种类→商品→费用→上架  
2. 用户端费用拆分正确（有规则 / 无规则两种）  
3. 留资写入且状态可流转  
4. 采购提醒与公告可配置  

- [ ] **Step 3: Commit**

```bash
git add docs/ops/bootstrap.md
git commit -m "docs: add cloud bootstrap and acceptance checklist"
```

---

## Spec coverage（自检）

| Spec 项 | Task |
|---------|------|
| 首页模块 | 8 |
| 分类二级结构 | 9 |
| 列表价摘要公式 | 2, 5, 9 |
| 详情费用 qty=1 | 2, 5, 10 |
| 留资 + openid | 6, 10 |
| 询价状态 | 6, 11, 14 |
| 品类/种类/商品/费用 | 7, 13 |
| 采购日配置 | 7, 14 |
| 关于我们/须知 | 11, 14 |
| 首个管理员 | 4, 15 |
| 无支付/购物车 | 全计划未包含 |
| 防刷 1 分钟 | 6 |
| Vue 3 管理端 | 12–14 |

## Placeholder scan

无 TBD/TODO 实现空洞；云函数 `../common` 依赖通过 `scripts/sync-common.js` 明确解决。

## Type consistency

- 询价状态：`new|contacted|won|closed`  
- 费用：`fixedAmountFen` / `rateBps` / `referencePriceFen`  
- 配置键名与 Task 7/14 一致  

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-29-haishi-anaya-daigou.md`. Two execution options:

**1. Subagent-Driven (recommended)** — 每个 Task 派生子代理，Task 间复查，迭代快  

**2. Inline Execution** — 本会话按 executing-plans 批量执行并设检查点  

Which approach?
