App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上基础库以使用云能力')
      return
    }
    wx.cloud.init({
      // env: 'your-env-id',
      traceUser: true
    })
    this.ensureLogin()
  },
  globalData: {
    openidReady: false
  },
  ensureLogin() {
    return wx.cloud
      .callFunction({ name: 'login' })
      .then(() => {
        this.globalData.openidReady = true
      })
      .catch((err) => {
        console.error('login failed', err)
        this.globalData.openidReady = false
      })
  }
})
