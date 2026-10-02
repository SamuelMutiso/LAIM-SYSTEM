import axios from 'axios'

const TOKEN_KEY = 'laim.tokens'
const store = {
  get() {
    try {
      return JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null')
    } catch {
      return null
    }
  },
  set(v) {
    try {
      if (v) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(v))
      else sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      return null
    }
    return v
  },
}
let memoryTokens = store.get()

export const tokens = {
  get: () => memoryTokens,
  set: (v) => {
    memoryTokens = v
    store.set(v)
  },
}

export const API_BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api`

const api = axios.create({ baseURL: API_BASE, timeout: 30000 })

api.interceptors.request.use((config) => {
  const t = tokens.get()
  if (t?.access_token) config.headers.Authorization = `Bearer ${t.access_token}`
  return config
})

let refreshing = null
let onSignedOut = () => {}
export const setSignedOutHandler = (fn) => (onSignedOut = fn)

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const t = tokens.get()
    if (status === 401 && t?.refresh_token && !original._retry && !original.url.includes('/auth/')) {
      original._retry = true
      try {
        refreshing ||= axios
          .post(`${API_BASE}/auth/refresh`, null, { headers: { Authorization: `Bearer ${t.refresh_token}` } })
          .then((r) => tokens.set({ ...t, access_token: r.data.access_token }))
          .finally(() => (refreshing = null))
        await refreshing
        return api(original)
      } catch {
        tokens.set(null)
        onSignedOut()
      }
    } else if (status === 401 && !original.url.includes('/auth/login')) {
      tokens.set(null)
      onSignedOut()
    }
    return Promise.reject(error)
  },
)

export const errorMessage = (e) => e?.response?.data?.message || e?.message || 'Something went wrong'
export const errorField = (e) => e?.response?.data?.field

export default api
