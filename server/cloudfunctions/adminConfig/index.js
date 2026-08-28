const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./common/respond')
const { requireAdmin } = require('./common/auth')

const KEYS = [
  'announcementTitle',
  'announcementContent',
  'nextPurchaseDate',
  'cutoffText',
  'customerWechat',
  'customerWorkWechatUrl',
  'guideText',
  'aboutText',
  'shippingNote',
  'leadSuccessText'
]

async function getAll() {
  const res = await db.collection('configs').limit(100).get()
  const map = {}
  KEYS.forEach((k) => {
    map[k] = ''
  })
  res.data.forEach((row) => {
    map[row.key] = row.value
  })
  return ok({ configs: map })
}

async function setMany(event) {
  const { configs } = event
  if (!configs || typeof configs !== 'object') {
    return fail('BAD_REQUEST', 'configs 无效')
  }
  for (const key of KEYS) {
    if (!(key in configs)) continue
    const value = configs[key] == null ? '' : String(configs[key])
    const exist = await db.collection('configs').where({ key }).limit(1).get()
    if (exist.data[0]) {
      await db.collection('configs').doc(exist.data[0]._id).update({
        data: { value, updatedAt: Date.now() }
      })
    } else {
      await db.collection('configs').add({
        data: { key, value, updatedAt: Date.now() }
      })
    }
  }
  return ok({})
}

exports.main = async (event) => {
  const admin = await requireAdmin(db, event.token)
  if (!admin) return fail('UNAUTHORIZED', '请重新登录')
  if (event.action === 'getAll') return getAll()
  if (event.action === 'setMany') return setMany(event)
  return fail('BAD_ACTION', '未知 action')
}
