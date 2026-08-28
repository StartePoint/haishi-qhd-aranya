const { request } = require('../../utils/http')

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
      const product = await request(`/catalog/products/${this.data.id}`)
      this.setData({ product })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
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
      const data = await request('/leads', {
        method: 'POST',
        auth: true,
        data: {
          productId: Number(this.data.id),
          ...this.data.form,
          qty: Number(this.data.form.qty) || 1
        }
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
  }
})
