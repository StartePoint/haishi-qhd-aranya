const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const { ok, fail } = require('./common/respond')
const { getOpenId } = require('./common/auth')

exports.main = async () => {
  const openid = getOpenId()
  if (!openid) return fail('NO_OPENID', '无法获取用户身份')
  return ok({ openid })
}
