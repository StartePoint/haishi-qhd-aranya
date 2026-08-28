const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./common/respond')
const { requireAdmin } = require('./common/auth')

const STATUS = ['new', 'contacted', 'won', 'closed']

async function list(event) {
  const { status, page = 1, pageSize = 20 } = event
  const where = {}
  if (status) where.status = status
  const countRes = await db.collection('leads').where(where).count()
  const listRes = await db
    .collection('leads')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  return ok({ list: listRes.data, total: countRes.total })
}

async function updateStatus(event) {
  const { id, status, adminRemark = '' } = event
  if (!id || !STATUS.includes(status)) {
    return fail('BAD_REQUEST', '状态无效')
  }
  await db.collection('leads').doc(id).update({
    data: {
      status,
      adminRemark: String(adminRemark),
      updatedAt: Date.now()
    }
  })
  return ok({ id })
}

exports.main = async (event) => {
  const admin = await requireAdmin(db, event.token)
  if (!admin) return fail('UNAUTHORIZED', '请重新登录')
  if (event.action === 'list') return list(event)
  if (event.action === 'updateStatus') return updateStatus(event)
  return fail('BAD_ACTION', '未知 action')
}
