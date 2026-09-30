import axios from 'axios'

export const IS_DEMO = import.meta.env.VITE_DEMO === 'true'

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

const api = axios.create({ baseURL: '/api', timeout: 20000 })

if (IS_DEMO) {
  const { default: demoAdapter } = await import('../demo/adapter.js')
  api.defaults.adapter = demoAdapter
}

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
          .post('/api/auth/refresh', null, { headers: { Authorization: `Bearer ${t.refresh_token}` } })
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
