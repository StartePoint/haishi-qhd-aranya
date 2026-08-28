import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Login from '../views/Login.vue'
import Layout from '../views/Layout.vue'
import Categories from '../views/Categories.vue'
import SubCategories from '../views/SubCategories.vue'
import Products from '../views/Products.vue'
import ProductEdit from '../views/ProductEdit.vue'
import Leads from '../views/Leads.vue'
import Configs from '../views/Configs.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    {
      path: '/',
      component: Layout,
      children: [
        { path: '', redirect: '/categories' },
        { path: 'categories', component: Categories },
        { path: 'sub-categories', component: SubCategories },
        { path: 'products', component: Products },
        { path: 'products/edit/:id?', component: ProductEdit },
        { path: 'leads', component: Leads },
        { path: 'configs', component: Configs }
      ]
    }
  ]
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.path !== '/login' && !auth.token) return '/login'
  if (to.path === '/login' && auth.token) return '/'
  return true
})

export default router
