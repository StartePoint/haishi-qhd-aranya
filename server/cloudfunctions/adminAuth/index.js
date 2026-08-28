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
