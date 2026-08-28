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
