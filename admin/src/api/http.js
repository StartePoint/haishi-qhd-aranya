import { useAuthStore } from '../stores/auth'

const BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000'

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const authStore = useAuthStore()
  const headers = { 'Content-Type': 'application/json' }
  if (auth && authStore.token) {
    headers.Authorization = `Bearer ${authStore.token}`
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  const json = await res.json()
  if (!json || json.code !== 0) {
    const err = new Error((json && json.message) || '请求失败')
    err.code = json && json.code
    throw err
  }
  return json.data
}
