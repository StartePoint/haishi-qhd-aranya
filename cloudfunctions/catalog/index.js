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
  if (!cat.data || !cat.data.enabled) return ok({ list: [], total: 0, subCategories: [] })

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

async function article(event) {
  const cfg = await getConfigMap()
  if (event.type === 'about') {
    return ok({ title: '关于我们', content: cfg.aboutText || '' })
  }
  return ok({ title: '代购须知', content: cfg.guideText || '' })
}

exports.main = async (event) => {
  const action = event.action
  if (action === 'home') return home()
  if (action === 'categories') return categories()
  if (action === 'products') return products(event)
  if (action === 'detail') return detail(event)
  if (action === 'article') return article(event)
  return fail('BAD_ACTION', '未知 action')
}
