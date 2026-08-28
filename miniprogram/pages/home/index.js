const { call } = require('../../utils/cloud')

Page({
  data: {
    announcementTitle: '',
    announcementContent: '',
    nextPurchaseDate: '',
    cutoffText: '',
    recommended: [],
    loading: true
  },
  onShow() {
    this.loadHome()
  },
  async loadHome() {
    this.setData({ loading: true })
    try {
      const data = await call('catalog', { action: 'home' })
      this.setData({
        announcementTitle: data.announcementTitle || '',
        announcementContent: data.announcementContent || '',
        nextPurchaseDate: data.nextPurchaseDate || '',
        cutoffText: data.cutoffText || '',
        recommended: data.recommended || [],
        loading: false
      })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },
  onTapAnnounce() {
    const { announcementTitle, announcementContent } = this.data
    if (!announcementContent) return
    wx.showModal({
      title: announcementTitle || '公告',
      content: announcementContent,
      showCancel: false
    })
  },
  goProduct(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/product/detail?id=${id}` })
  },
  goGuide() {
    wx.navigateTo({ url: '/pages/mine/article?type=guide' })
  }
})
