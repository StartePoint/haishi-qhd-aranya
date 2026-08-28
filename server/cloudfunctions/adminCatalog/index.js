const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./common/respond')
const { requireAdmin } = require('./common/auth')

async function withAdmin(event) {
  const admin = await requireAdmin(db, event.token)
  if (!admin) return { error: fail('UNAUTHORIZED', '请重新登录') }
  return { admin }
}

async function listCategories() {
  const res = await db.collection('categories').orderBy('sort', 'asc').get()
  return ok({ list: res.data })
}

async function saveCategory(event) {
  const { id, name, icon = '', sort = 0, enabled = true } = event
  if (!name) return fail('BAD_REQUEST', '名称必填')
  const data = {
    name: String(name).trim(),
    icon,
    sort: Number(sort) || 0,
    enabled: !!enabled,
    updatedAt: Date.now()
  }
  if (id) {
    await db.collection('categories').doc(id).update({ data })
    return ok({ id })
  }
  data.createdAt = Date.now()
  const addRes = await db.collection('categories').add({ data })
  return ok({ id: addRes._id })
}

async function setCategoryEnabled(event) {
  const { id, enabled } = event
  if (!id) return fail('BAD_REQUEST', '缺少 id')
  await db.collection('categories').doc(id).update({
    data: { enabled: !!enabled, updatedAt: Date.now() }
  })
  return ok({ id })
}

async function listSubCategories(event) {
  const { categoryId } = event
  if (!categoryId) return fail('BAD_REQUEST', '缺少 categoryId')
  const res = await db
    .collection('sub_categories')
    .where({ categoryId })
    .orderBy('sort', 'asc')
    .get()
  return ok({ list: res.data })
}

async function saveSubCategory(event) {
  const { id, categoryId, name, sort = 0, enabled = true } = event
  if (!categoryId || !name) return fail('BAD_REQUEST', '品类与名称必填')
  const cat = await db.collection('categories').doc(categoryId).get()
  if (!cat.data) return fail('BAD_REQUEST', '品类不存在')
  const data = {
    categoryId,
    name: String(name).trim(),
    sort: Number(sort) || 0,
    enabled: !!enabled,
    updatedAt: Date.now()
  }
  if (id) {
    await db.collection('sub_categories').doc(id).update({ data })
    return ok({ id })
  }
  data.createdAt = Date.now()
  const addRes = await db.collection('sub_categories').add({ data })
  return ok({ id: addRes._id })
}

async function setSubCategoryEnabled(event) {
  const { id, enabled } = event
  if (!id) return fail('BAD_REQUEST', '缺少 id')
  await db.collection('sub_categories').doc(id).update({
    data: { enabled: !!enabled, updatedAt: Date.now() }
  })
  return ok({ id })
}

async function listProducts(event) {
  const { categoryId, page = 1, pageSize = 20 } = event
  const where = {}
  if (categoryId) where.categoryId = categoryId
  const countRes = await db.collection('products').where(where).count()
  const listRes = await db
    .collection('products')
    .where(where)
    .orderBy('sort', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  return ok({ list: listRes.data, total: countRes.total })
}

async function getProduct(event) {
  const { id } = event
  if (!id) return fail('BAD_REQUEST', '缺少 id')
  const prod = await db.collection('products').doc(id).get()
  if (!prod.data) return fail('NOT_FOUND', '商品不存在')
  const rules = await db
    .collection('fee_rules')
    .where({ scope: 'product', productId: id })
    .limit(1)
    .get()
  return ok({ product: prod.data, productFeeRule: rules.data[0] || null })
}

async function saveProduct(event) {
  const {
    id,
    name,
    cover = '',
    gallery = [],
    specText = '',
    detailHtml = '',
    subCategoryId,
    referencePriceFen,
    isRecommended = false,
    sort = 0,
    onSale = true,
    feeRule
  } = event
  if (!name || !subCategoryId) {
    return fail('BAD_REQUEST', '名称与种类必填')
  }
  const sub = await db.collection('sub_categories').doc(subCategoryId).get()
  if (!sub.data) return fail('BAD_REQUEST', '种类不存在')
  const categoryId = sub.data.categoryId
  const data = {
    name: String(name).trim(),
    cover,
    gallery,
    specText,
    detailHtml,
    subCategoryId,
    categoryId,
    referencePriceFen: Math.round(Number(referencePriceFen) || 0),
    isRecommended: !!isRecommended,
    sort: Number(sort) || 0,
    onSale: !!onSale,
    updatedAt: Date.now()
  }
  let productId = id
  if (id) {
    await db.collection('products').doc(id).update({ data })
  } else {
    data.createdAt = Date.now()
    const addRes = await db.collection('products').add({ data })
    productId = addRes._id
  }

  if (feeRule === null) {
    const old = await db
      .collection('fee_rules')
      .where({ scope: 'product', productId })
      .get()
    for (const r of old.data) {
      await db.collection('fee_rules').doc(r._id).remove()
    }
  } else if (feeRule && feeRule.type) {
    await upsertFeeRule({
      scope: 'product',
      productId,
      categoryId: null,
      type: feeRule.type,
      fixedAmountFen: feeRule.fixedAmountFen,
      rateBps: feeRule.rateBps
    })
  }

  return ok({ id: productId })
}

async function upsertFeeRule(rule) {
  const where =
    rule.scope === 'product'
      ? { scope: 'product', productId: rule.productId }
      : { scope: 'category', categoryId: rule.categoryId }
  const old = await db.collection('fee_rules').where(where).get()
  for (const r of old.data) {
    await db.collection('fee_rules').doc(r._id).remove()
  }
  await db.collection('fee_rules').add({
    data: {
      scope: rule.scope,
      productId: rule.productId || null,
      categoryId: rule.categoryId || null,
      type: rule.type,
      fixedAmountFen: Number(rule.fixedAmountFen) || 0,
      rateBps: Number(rule.rateBps) || 0,
      updatedAt: Date.now(),
      createdAt: Date.now()
    }
  })
}

async function getFeeRules(event) {
  const { categoryId } = event
  if (!categoryId) return fail('BAD_REQUEST', '缺少 categoryId')
  const res = await db
    .collection('fee_rules')
    .where({ scope: 'category', categoryId })
    .limit(1)
    .get()
  return ok({ categoryFeeRule: res.data[0] || null })
}

async function saveFeeRule(event) {
  const { scope, categoryId, productId, type, fixedAmountFen, rateBps } = event
  if (scope === 'category') {
    if (!categoryId || !type) return fail('BAD_REQUEST', '参数不完整')
    await upsertFeeRule({
      scope: 'category',
      categoryId,
      productId: null,
      type,
      fixedAmountFen,
      rateBps
    })
    return ok({})
  }
  if (scope === 'product') {
    if (!productId || !type) return fail('BAD_REQUEST', '参数不完整')
    await upsertFeeRule({
      scope: 'product',
      productId,
      categoryId: null,
      type,
      fixedAmountFen,
      rateBps
    })
    return ok({})
  }
  return fail('BAD_REQUEST', 'scope 无效')
}

exports.main = async (event) => {
  const gate = await withAdmin(event)
  if (gate.error) return gate.error
  const { action } = event
  if (action === 'listCategories') return listCategories()
  if (action === 'saveCategory') return saveCategory(event)
  if (action === 'setCategoryEnabled') return setCategoryEnabled(event)
  if (action === 'listSubCategories') return listSubCategories(event)
  if (action === 'saveSubCategory') return saveSubCategory(event)
  if (action === 'setSubCategoryEnabled') return setSubCategoryEnabled(event)
  if (action === 'listProducts') return listProducts(event)
  if (action === 'getProduct') return getProduct(event)
  if (action === 'saveProduct') return saveProduct(event)
  if (action === 'getFeeRules') return getFeeRules(event)
  if (action === 'saveFeeRule') return saveFeeRule(event)
  return fail('BAD_ACTION', '未知 action')
}
