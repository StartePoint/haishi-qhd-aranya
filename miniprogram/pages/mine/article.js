const { call } = require('../../utils/cloud')

Page({
  data: {
    title: '',
    content: ''
  },
  onLoad(query) {
    const type = query.type === 'about' ? 'about' : 'guide'
    this.loadArticle(type)
  },
  async loadArticle(type) {
    try {
      const data = await call('catalog', { action: 'article', type })
      this.setData({
        title: data.title || '',
        content: data.content || '暂无内容'
      })
      wx.setNavigationBarTitle({ title: data.title || '说明' })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  }
})
