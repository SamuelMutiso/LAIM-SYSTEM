import api from './client'

const get = (url, params) => api.get(url, { params }).then((r) => r.data)
const post = (url, body) => api.post(url, body).then((r) => r.data)
const put = (url, body) => api.put(url, body).then((r) => r.data)
const del = (url) => api.delete(url).then((r) => r.data)

export const Auth = {
  login: (email, password) => post('/auth/login', { email, password }),
  me: () => get('/auth/me'),
  changePassword: (body) => post('/auth/password', body),
}

export const Dashboard = { get: (params) => get('/dashboard', params) }

export const Members = {
  list: (params) => get('/members', params),
  get: (id) => get(`/members/${id}`),
  create: (body) => post('/members', body),
  update: (id, body) => put(`/members/${id}`, body),
}

export const Tithes = {
  list: (params) => get('/tithes', params),
  create: (body) => post('/tithes', body),
  remove: (id) => del(`/tithes/${id}`),
  report: (params) => get('/reports/tithe', params),
}

export const Offerings = {
  list: (params) => get('/offerings', params),
  create: (body) => post('/offerings', body),
  remove: (id) => del(`/offerings/${id}`),
  report: (params) => get('/reports/offering', params),
}

export const Pledges = {
  list: (params) => get('/pledges', params),
  create: (body) => post('/pledges', body),
  pay: (id, body) => post(`/pledges/${id}/payments`, body),
  fund: (params) => get('/building-fund', params),
  contribute: (body) => post('/building-fund', body),
}

export const HomeChurch = {
  cells: () => get('/cells'),
  roster: (id) => get(`/cells/${id}/roster`),
  reports: (params) => get('/cell-reports', params),
  submit: (body) => post('/cell-reports', body),
  addCell: (body) => post('/cells', body),
  updateCell: (id, body) => put(`/cells/${id}`, body),
}

export const Leaders = {
  list: () => get('/leaders'),
  assign: (body) => post('/leaders', body),
  worshipTeam: () => get('/worship-team'),
}

export const Inventory = {
  list: (params) => get('/inventory', params),
  create: (body) => post('/inventory', body),
  update: (id, body) => put(`/inventory/${id}`, body),
  stockTake: (id, body) => post(`/inventory/${id}/stock-take`, body),
  history: (id) => get(`/inventory/${id}/history`),
}

export const Audit = { list: () => get('/audit') }

export const Departments = {
  list: () => get('/departments'),
  get: (id) => get(`/departments/${id}`),
  create: (body) => post('/departments', body),
  update: (id, body) => put(`/departments/${id}`, body),
  members: (id) => get(`/departments/${id}/members`),
  candidates: (id) => get(`/departments/${id}/candidates`),
  addMember: (id, body) => post(`/departments/${id}/members`, body),
  removeMember: (id, rowId) => del(`/departments/${id}/members/${rowId}`),
  reports: (id) => get(`/departments/${id}/reports`),
  addReport: (id, body) => post(`/departments/${id}/reports`, body),
  issueLogin: (id, body) => post(`/departments/${id}/login`, body),
}

export const Reports = {
  download: (kind, params) => api.get(`/reports/download/${kind}.xlsx`, { params, responseType: 'blob' }).then((r) => r.data),
}
