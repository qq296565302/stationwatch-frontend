import axios from 'axios'

const STORAGE_KEY = 'dutyguard_auth'

const getAuth = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
const setAuth = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}
const clearAuth = () => {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1',
  timeout: 15000,
})

// 请求：自动加 token
api.interceptors.request.use((config) => {
  const auth = getAuth()
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})

// 响应：401 自动 refresh 一次
let refreshing = null

api.interceptors.response.use(
  (resp) => resp.data,
  async (error) => {
    const auth = getAuth()
    const status = error.response?.status
    const original = error.config || {}

    // 401：尝试 refresh 一次；refresh 不可用或失败则清认证并跳登录页
    if (status === 401) {
      const isLoginReq = /\/auth\/login$/.test(original.url || '')
      // 登录请求不做 refresh（此时尚无 refreshToken），直接抛后端提示（如「账号或密码错误」）
      if (!isLoginReq && auth.refreshToken && !original._retried) {
        original._retried = true
        try {
          if (!refreshing) {
            refreshing = axios.post(
              (import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1') + '/auth/refresh',
              { refreshToken: auth.refreshToken }
            ).then(r => r.data)
          }
          const { data } = await refreshing
          refreshing = null
          const newAuth = { ...auth, accessToken: data.accessToken }
          setAuth(newAuth)
          original.headers.Authorization = `Bearer ${data.accessToken}`
          return api.request(original)
        } catch (e) {
          refreshing = null
        }
      }
      // refresh 失败或不可用：清除认证，hash 跳转登录页（不整页刷新，避免 hash 路由死循环）
      clearAuth()
      if (!window.location.hash.includes('#/login')) {
        window.location.hash = '#/login'
      }
      // 优先抛后端返回的中文提示（如「账号或密码错误」），避免裸 401 描述
      const err = new Error(error.response?.data?.message || error.message || '登录状态已失效，请重新登录')
      err.code = error.response?.data?.code
      return Promise.reject(err)
    }

    // 业务错误：抛 message
    if (error.response?.data) {
      const body = error.response.data
      const err = new Error(body.message || '请求失败')
      err.code = body.code
      err.data = body.data
      return Promise.reject(err)
    }
    return Promise.reject(error)
  }
)

export { getAuth, setAuth, clearAuth }
export default api
