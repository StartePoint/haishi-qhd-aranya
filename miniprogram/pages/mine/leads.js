const { call } = require('../../utils/cloud')
const { fenToYuanText } = require('../../utils/format')

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
      const data = await call('lead', { action: 'mine' })
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
