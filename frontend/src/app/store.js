import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { Auth } from '../api/services'
import { tokens, errorMessage } from '../api/client'

export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const data = await Auth.login(email, password)
    tokens.set({ access_token: data.access_token, refresh_token: data.refresh_token })
    return data.user
  } catch (e) {
    return rejectWithValue(errorMessage(e))
  }
})

export const restoreSession = createAsyncThunk('auth/restore', async (_, { rejectWithValue }) => {
  if (!tokens.get()) return rejectWithValue(null)
  try {
    return await Auth.me()
  } catch {
    tokens.set(null)
    return rejectWithValue(null)
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, status: 'restoring', error: null },
  reducers: {
    logout(state) {
      tokens.set(null)
      state.user = null
      state.status = 'idle'
    },
  },
  extraReducers: (b) => {
    b.addCase(login.pending, (s) => {
      s.status = 'loading'
      s.error = null
    })
      .addCase(login.fulfilled, (s, a) => {
        s.status = 'idle'
        s.user = a.payload
      })
      .addCase(login.rejected, (s, a) => {
        s.status = 'idle'
        s.error = a.payload
      })
      .addCase(restoreSession.fulfilled, (s, a) => {
        s.status = 'idle'
        s.user = a.payload
      })
      .addCase(restoreSession.rejected, (s) => {
        s.status = 'idle'
      })
  },
})

let toastId = 0
const uiSlice = createSlice({
  name: 'ui',
  initialState: { branchFilter: '', sidebarOpen: false, toasts: [], dataVersion: 0 },
  reducers: {
    setBranchFilter(s, a) {
      s.branchFilter = a.payload
    },
    setSidebar(s, a) {
      s.sidebarOpen = a.payload
    },
    pushToast: {
      reducer(s, a) {
        s.toasts.push(a.payload)
      },
      prepare(message, tone = 'success') {
        return { payload: { id: ++toastId, message, tone } }
      },
    },
    dismissToast(s, a) {
      s.toasts = s.toasts.filter((t) => t.id !== a.payload)
    },
    bumpData(s) {
      s.dataVersion += 1
    },
  },
})

export const { logout } = authSlice.actions
export const { setBranchFilter, setSidebar, pushToast, dismissToast, bumpData } = uiSlice.actions

export const store = configureStore({
  reducer: { auth: authSlice.reducer, ui: uiSlice.reducer },
})

export const selectUser = (s) => s.auth.user
export const selectCanWrite = (s) => s.auth.user?.role === 'secretary'
export const selectIsBishop = (s) => s.auth.user?.role === 'bishop'

export const selectBranchParam = (s) => (s.auth.user?.role === 'bishop' ? s.ui.branchFilter : '')
