import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('haishi_admin_token') || '',
    username: localStorage.getItem('haishi_admin_username') || ''
  }),
  actions: {
    setSession({ token, username }) {
      this.token = token
      this.username = username
      localStorage.setItem('haishi_admin_token', token)
      localStorage.setItem('haishi_admin_username', username)
    },
    logout() {
      this.token = ''
      this.username = ''
      localStorage.removeItem('haishi_admin_token')
      localStorage.removeItem('haishi_admin_username')
    }
  }
})
