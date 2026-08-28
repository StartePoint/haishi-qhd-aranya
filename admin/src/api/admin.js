import { api } from './http'

export const adminApi = {
  login: (username, password) =>
    api('/admin/auth/login', {
      method: 'POST',
      body: { username, password },
      auth: false
    }),
  listCategories: () => api('/admin/categories'),
  saveCategory: (payload) => {
    if (payload.id) {
      return api(`/admin/categories/${payload.id}`, {
        method: 'PUT',
        body: payload
      })
    }
    return api('/admin/categories', { method: 'POST', body: payload })
  },
  setCategoryEnabled: (id, enabled) =>
    api(`/admin/categories/${id}`, { method: 'PATCH', body: { enabled } }),
  listSubCategories: (categoryId) =>
    api(`/admin/sub-categories?category_id=${categoryId}`),
  saveSubCategory: (payload) => {
    if (payload.id) {
      return api(`/admin/sub-categories/${payload.id}`, {
        method: 'PUT',
        body: payload
      })
    }
    return api('/admin/sub-categories', {
      method: 'POST',
      body: {
        categoryId: payload.categoryId,
        name: payload.name,
        sort: payload.sort,
        enabled: payload.enabled
      }
    })
  },
  setSubCategoryEnabled: (id, enabled) =>
    api(`/admin/sub-categories/${id}`, {
      method: 'PUT',
      body: { enabled }
    }),
  listProducts: (payload = {}) => {
    const q = new URLSearchParams()
    if (payload.categoryId) q.set('category_id', payload.categoryId)
    if (payload.page) q.set('page', payload.page)
    return api(`/admin/products?${q.toString()}`)
  },
  getProduct: (id) => api(`/admin/products/${id}`),
  saveProduct: (payload) => {
    const body = {
      name: payload.name,
      subCategoryId: payload.subCategoryId,
      cover: payload.cover,
      gallery: payload.gallery,
      specText: payload.specText,
      detailHtml: payload.detailHtml,
      referencePriceFen: payload.referencePriceFen,
      isRecommended: payload.isRecommended,
      sort: payload.sort,
      onSale: payload.onSale,
      feeRule: payload.feeRule
    }
    if (payload.id) {
      return api(`/admin/products/${payload.id}`, { method: 'PUT', body })
    }
    return api('/admin/products', { method: 'POST', body })
  },
  getFeeRules: async (categoryId) => {
    // optional: not used heavily; return empty
    return { categoryFeeRule: null, categoryId }
  },
  saveFeeRule: (payload) =>
    api(`/admin/categories/${payload.categoryId}/fee-rule`, {
      method: 'PUT',
      body: payload
    }),
  listLeads: (payload = {}) => {
    const q = new URLSearchParams()
    if (payload.status) q.set('status', payload.status)
    if (payload.page) q.set('page', payload.page)
    return api(`/admin/leads?${q.toString()}`)
  },
  updateLeadStatus: (payload) =>
    api(`/admin/leads/${payload.id}`, {
      method: 'PATCH',
      body: {
        status: payload.status,
        adminRemark: payload.adminRemark
      }
    }),
  getConfigs: () => api('/admin/configs'),
  setConfigs: (configs) =>
    api('/admin/configs', { method: 'PUT', body: { configs } })
}
