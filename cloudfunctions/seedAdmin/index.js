const cloud = require('wx-server-sdk')
const crypto = require('crypto')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./common/respond')
const { hashPassword } = require('./common/auth')

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
