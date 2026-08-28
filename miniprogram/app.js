const { request } = require('./utils/http')

App({
  onLaunch() {
    this.ensureLogin()
  },
  globalData: {
    openidReady: false
  },
  ensureLogin() {
    return new Promise((resolve) => {
      wx.login({
        success: (loginRes) => {
          request('/auth/wechat_login', {
            method: 'POST',
            data: { code: loginRes.code || 'dev' }
          })
            .then((data) => {
              wx.setStorageSync('token', data.token)
              this.globalData.openidReady = true
              resolve(true)
            })
            .catch((err) => {
              console.error('login failed', err)
              this.globalData.openidReady = false
              resolve(false)
            })
        },
        fail: () => {
          request('/auth/wechat_login', {
            method: 'POST',
            data: { code: 'dev' }
          })
            .then((data) => {
              wx.setStorageSync('token', data.token)
              this.globalData.openidReady = true
              resolve(true)
            })
            .catch(() => {
              this.globalData.openidReady = false
              resolve(false)
            })
        }
      })
    })
  }
})
