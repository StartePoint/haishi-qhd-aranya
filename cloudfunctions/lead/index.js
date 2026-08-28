const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./common/respond')
const { getOpenId } = require('./common/auth')
const {
  calcServiceFeeFen,
  resolveRule,
  buildPriceSummary
} = require('./common/fee')

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

  const {
    productId,
    contactName,
    phone,
    wechat = '',
    qty = 1,
    remark = ''
  } = event
  if (!productId || !contactName || !phone) {
    return fail('BAD_REQUEST', '请填写必填项')
  }
  if (!PHONE_RE.test(String(phone))) {
    return fail('BAD_PHONE', '手机号格式不正确')
  }
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
  const serviceFeeFen = calcServiceFeeFen(rule, p.referencePriceFen, quantity)

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

  const cfg = await db
    .collection('configs')
    .where({ key: 'leadSuccessText' })
    .limit(1)
    .get()
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
