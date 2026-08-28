import cloudbase from '@cloudbase/js-sdk'
import { useAuthStore } from '../stores/auth'

// 替换为你的云开发环境 ID
const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV || 'your-env-id'

let app = null

function getApp() {
  if (!app) {
    app = cloudbase.init({ env: ENV_ID })
  }
  return app
}

export async function callAdmin(name, data = {}) {
  const auth = useAuthStore()
  const cloudApp = getApp()
  // 管理端以未登录微信身份调用云函数时，需在控制台允许未登录访问对应云函数，
  // 或配置自定义登录。一期约定：云函数靠 event.token 鉴权。
  const res = await cloudApp.callFunction({
    name,
    data: {
      ...data,
      token: auth.token
    }
  })
  const body = res.result
  if (!body || body.ok !== true) {
    const err = new Error((body && body.message) || '请求失败')
    err.code = body && body.code
    throw err
  }
  return body.data
}
