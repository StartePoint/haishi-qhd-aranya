const { request } = require('../../utils/http')

const STATUS_MAP = {
  new: '新询价',
  contacted: '已沟通',
  won: '已成交',
  closed: '已关闭'
}

Page({
  data: {
    list: [],
    loading: true
  },
  onShow() {
    this.loadList()
  },
  async loadList() {
    this.setData({ loading: true })
    try {
      const app = getApp()
      if (!app.globalData.openidReady) await app.ensureLogin()
      const data = await request('/leads/mine', { auth: true })
      const list = (data.list || []).map((item) => ({
        ...item,
        statusText: STATUS_MAP[item.status] || item.status,
        timeText: item.createdAt
          ? new Date(item.createdAt).toLocaleString()
          : ''
      }))
      this.setData({ list, loading: false })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  }
})
