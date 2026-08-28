const { request } = require('../../utils/http')

Page({
  data: {
    nickName: '海拾用户',
    customerWechat: ''
  },
  onShow() {
    this.loadCfg()
  },
  async loadCfg() {
    try {
      const data = await request('/catalog/home')
      this.setData({ customerWechat: data.customerWechat || '' })
    } catch (e) {}
  },
  goLeads() {
    wx.navigateTo({ url: '/pages/mine/leads' })
  },
  goGuide() {
    wx.navigateTo({ url: '/pages/mine/article?type=guide' })
  },
  goAbout() {
    wx.navigateTo({ url: '/pages/mine/article?type=about' })
  },
  copyWechat() {
    const wxid = this.data.customerWechat
    if (!wxid) {
      wx.showToast({ title: '暂未配置客服微信', icon: 'none' })
      return
    }
    wx.setClipboardData({ data: wxid })
  }
})
