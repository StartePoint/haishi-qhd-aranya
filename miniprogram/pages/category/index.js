const { request } = require('../../utils/http')

Page({
  data: {
    categories: [],
    activeCategoryId: '',
    subCategories: [],
    activeSubId: '',
    list: [],
    page: 1,
    total: 0,
    loading: false
  },
  onLoad() {
    this.loadCategories()
  },
  async loadCategories() {
    try {
      const data = await request('/catalog/categories')
      const categories = data.list || []
      const activeCategoryId = categories[0] ? categories[0].id : ''
      this.setData({ categories, activeCategoryId })
      if (activeCategoryId) this.loadProducts(true)
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },
  onSelectCategory(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ activeCategoryId: id, activeSubId: '', page: 1 })
    this.loadProducts(true)
  },
  onSelectSub(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ activeSubId: id, page: 1 })
    this.loadProducts(true)
  },
  async loadProducts(reset) {
    const { activeCategoryId, activeSubId, page, list, loading } = this.data
    if (!activeCategoryId || loading) return
    this.setData({ loading: true })
    try {
      let path = `/catalog/products?category_id=${activeCategoryId}&page=${
        reset ? 1 : page
      }&page_size=20`
      if (activeSubId) path += `&sub_category_id=${activeSubId}`
      const data = await request(path)
      const nextList = reset ? data.list : list.concat(data.list || [])
      this.setData({
        subCategories: data.subCategories || [],
        list: nextList,
        total: data.total || 0,
        page: reset ? 2 : page + 1,
        loading: false
      })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },
  onReachBottom() {
    if (this.data.list.length >= this.data.total) return
    this.loadProducts(false)
  },
  onTapProduct(e) {
    const id = e.detail.id
    wx.navigateTo({ url: `/pages/product/detail?id=${id}` })
  }
})
