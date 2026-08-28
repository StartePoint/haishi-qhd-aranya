import { callAdmin } from './http'

export const adminApi = {
  login: (username, password) =>
    callAdmin('adminAuth', { action: 'login', username, password }),
  me: () => callAdmin('adminAuth', { action: 'me' }),
  listCategories: () => callAdmin('adminCatalog', { action: 'listCategories' }),
  saveCategory: (payload) =>
    callAdmin('adminCatalog', { action: 'saveCategory', ...payload }),
  setCategoryEnabled: (id, enabled) =>
    callAdmin('adminCatalog', { action: 'setCategoryEnabled', id, enabled }),
  listSubCategories: (categoryId) =>
    callAdmin('adminCatalog', { action: 'listSubCategories', categoryId }),
  saveSubCategory: (payload) =>
    callAdmin('adminCatalog', { action: 'saveSubCategory', ...payload }),
  setSubCategoryEnabled: (id, enabled) =>
    callAdmin('adminCatalog', {
      action: 'setSubCategoryEnabled',
      id,
      enabled
    }),
  listProducts: (payload) =>
    callAdmin('adminCatalog', { action: 'listProducts', ...payload }),
  getProduct: (id) => callAdmin('adminCatalog', { action: 'getProduct', id }),
  saveProduct: (payload) =>
    callAdmin('adminCatalog', { action: 'saveProduct', ...payload }),
  getFeeRules: (categoryId) =>
    callAdmin('adminCatalog', { action: 'getFeeRules', categoryId }),
  saveFeeRule: (payload) =>
    callAdmin('adminCatalog', { action: 'saveFeeRule', ...payload }),
  listLeads: (payload) =>
    callAdmin('adminLead', { action: 'list', ...payload }),
  updateLeadStatus: (payload) =>
    callAdmin('adminLead', { action: 'updateStatus', ...payload }),
  getConfigs: () => callAdmin('adminConfig', { action: 'getAll' }),
  setConfigs: (configs) =>
    callAdmin('adminConfig', { action: 'setMany', configs })
}
