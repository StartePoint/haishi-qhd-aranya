const { call } = require('../../utils/cloud')
const { fenToYuanText } = require('../../utils/format')

Page({
  data: {
    id: '',
    product: null,
    showForm: false,
    form: {
      contactName: '',
      phone: '',
      wechat: '',
      qty: 1,
      remark: ''
    },
    submitting: false
  },
  onLoad(query) {
    this.setData({ id: query.id || '' })
    this.loadDetail()
  },
  async loadDetail() {
    try {
      const product = await call('catalog', {
        action: 'detail',
        productId: this.data.id
      })
      const ps = product.priceSummary || {}
      const { fenToYuanText } = require('../../utils/format')
      product.priceSummary = {
        ...ps,
        referenceFenText: fenToYuanText(ps.referenceFen),
        serviceFeeFenText: fenToYuanText(ps.serviceFeeFen),
        totalFenText: fenToYuanText(ps.totalFen)
      }
      this.setData({ product })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },
  fen(v) {
    return fenToYuanText(v)
  },
  openForm() {
    this.setData({ showForm: true })
  },
  closeForm() {
    this.setData({ showForm: false })
  },
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },
  async submitLead() {
    const app = getApp()
    if (!app.globalData.openidReady) {
      await app.ensureLogin()
    }
    if (!app.globalData.openidReady) {
      wx.showToast({ title: '登录后才能提交', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      const data = await call('lead', {
        action: 'create',
        productId: this.data.id,
        ...this.data.form,
        qty: Number(this.data.form.qty) || 1
      })
      this.setData({ showForm: false, submitting: false })
      wx.showModal({
        title: '提交成功',
        content: data.leadSuccessText || '将在 24 小时内联系您',
        showCancel: false
      })
    } catch (e) {
      this.setData({ submitting: false })
      wx.showToast({ title: e.message || '提交失败', icon: 'none' })
    }
  },
  copyWechat() {
    const wxid = this.data.product && this.data.product.customerWechat
    if (!wxid) {
      wx.showToast({ title: '暂未配置客服微信', icon: 'none' })
      return
    }
    wx.setClipboardData({ data: wxid })
  },
  openWorkWechat() {
    const url =
      this.data.product && this.data.product.customerWorkWechatUrl
    if (!url) {
      wx.showToast({ title: '暂未配置企微链接', icon: 'none' })
      return
    }
    wx.setClipboardData({ data: url })
  }
})
