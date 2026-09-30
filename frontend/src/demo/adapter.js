import { AxiosError } from 'axios'
import { format, startOfMonth, endOfMonth, subMonths, addDays, parseISO, isWithinInterval, startOfWeek, endOfWeek, getMonth, getDate } from 'date-fns'
import * as seed from './seed'
import { BRANCHES } from '../lib/constants'
import { groupFor } from '../lib/utils'

const TODAY = new Date(2026, 8, 29)
const iso = (d) => format(d, 'yyyy-MM-dd')

const db = {
  members: seed.members,
  cells: seed.cells,
  tithes: seed.tithes,
  offerings: seed.offerings,
  pledges: seed.pledges,
  pledgePayments: seed.pledgePayments,
  buildingFund: seed.buildingFund,
  cellReports: seed.cellReports,
  leaders: seed.leaders,
  worshipTeam: seed.worshipTeam,
  inventory: seed.inventory,
  stockTakes: seed.stockTakes,
  audit: seed.audit,
}
const nextId = (arr) => arr.reduce((m, x) => Math.max(m, x.id), 0) + 1

const acacia = db.cells.find((c) => c.name === 'Acacia')
export const DEMO_USERS = [
  { id: 1, email: 'bishop@laim.church', name: 'Bishop Dr. Donald Mutiso', role: 'bishop', branch_id: 1, cell_id: null },
  { id: 2, email: 'secretary.hq@laim.church', name: 'Secretary — HQ', role: 'secretary', branch_id: 1, cell_id: null },
  { id: 3, email: 'pastor.korrompoi@laim.church', name: 'Pastor — Korrompoi', role: 'pastor', branch_id: 2, cell_id: null },
  { id: 4, email: 'acacia@laim.church', name: `${db.members.find((m) => m.id === acacia.leader_member_id)?.full_name ?? 'Leader'}`, role: 'cell_leader', branch_id: 1, cell_id: acacia.id },
  { id: 5, email: 'secretary.matuu@laim.church', name: 'Secretary — Matuu', role: 'secretary', branch_id: 4, cell_id: null },
]

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

const memberName = (id) => db.members.find((m) => m.id === id)?.full_name ?? '—'
const cellName = (id) => db.cells.find((c) => c.id === id)?.name ?? '—'

function enrichMember(m) {
  return { ...m, group: groupFor(m), home_church: cellName(m.home_church_id) }
}

function pledgeView(p) {
  const payments = db.pledgePayments.filter((x) => x.pledge_id === p.id).sort((a, b) => a.date.localeCompare(b.date))
  const paid = payments.reduce((t, x) => t + x.amount, 0)
  const balance = Math.max(0, p.amount - paid)
  let status = 'Partly Paid'
  if (balance === 0) status = 'Fully Paid'
  else if (parseISO(p.due_date) < TODAY) status = 'Overdue'
  else if (paid === 0) status = 'Not Started'
  return { ...p, member_name: memberName(p.member_id), paid, balance, status, payments }
}

function scopeBranch(user, requested) {
  if (user.role === 'bishop') return requested ? Number(requested) : null
  return user.branch_id
}
const inBranch = (branch) => (row) => branch === null || row.branch_id === branch
function inRange(from, to) {
  return (row) => (!from || row.date >= from) && (!to || row.date <= to)
}
function requireWrite(user, branchId) {
  if (user.role !== 'secretary') throw new HttpError(403, 'Only the branch secretary can enter or edit records.')
  if (branchId && Number(branchId) !== user.branch_id) throw new HttpError(403, 'You can only enter records for your own branch.')
}
function log(user, action, target) {
  db.audit.unshift({ id: nextId(db.audit), at: new Date().toISOString().slice(0, 19), user: user.name, action, target })
}

function referenceTaken(ref) {
  if (!ref) return false
  const r = ref.trim().toUpperCase()
  return (
    db.tithes.some((t) => (t.reference || '').toUpperCase() === r) ||
    db.pledgePayments.some((t) => (t.reference || '').toUpperCase() === r) ||
    db.buildingFund.contributions.some((t) => (t.reference || '').toUpperCase() === r)
  )
}
function validatePayment(body) {
  const amount = Number(body.amount)
  if (!amount || amount <= 0) throw new HttpError(422, 'Amount must be greater than zero.', { field: 'amount' })
  if (!['mpesa', 'bank', 'cash'].includes(body.method)) throw new HttpError(422, 'Choose a payment method.', { field: 'method' })
  if (body.method === 'mpesa') {
    if (!/^[A-Z0-9]{10}$/i.test(body.reference || '')) throw new HttpError(422, 'An M-Pesa code is 10 letters/numbers, e.g. UJK4H7X2PQ.', { field: 'reference' })
  }
  if (body.method === 'bank' && !(body.reference || '').trim()) throw new HttpError(422, 'Enter the bank reference.', { field: 'reference' })
  if (body.method !== 'cash' && referenceTaken(body.reference)) throw new HttpError(409, `The reference ${body.reference.toUpperCase()} has already been recorded.`, { field: 'reference' })
  return { amount, method: body.method, reference: body.method === 'cash' ? '' : body.reference.trim().toUpperCase() }
}

const monthKey = (d) => d.slice(0, 7)
function sumBy(rows, keyFn, valFn = (r) => r.amount) {
  const out = {}
  rows.forEach((r) => {
    const k = keyFn(r)
    out[k] = (out[k] || 0) + valFn(r)
  })
  return out
}

const routes = []
const route = (method, pattern, handler) => {
  const keys = []
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '(\\d+)')) + '$')
  routes.push({ method, re, keys, handler })
}

route('post', '/auth/login', ({ body }) => {
  const u = DEMO_USERS.find((x) => x.email.toLowerCase() === String(body.email || '').trim().toLowerCase())
  if (!u || !body.password) throw new HttpError(401, 'Email or password is incorrect.')
  return { access_token: `demo.${u.id}`, refresh_token: `demo-refresh.${u.id}`, user: u }
})
route('get', '/auth/me', ({ user }) => user)
route('get', '/branches', () => BRANCHES)

route('get', '/members', ({ user, q }) => {
  const branch = scopeBranch(user, q.branch_id)
  let rows = db.members.filter(inBranch(branch)).map(enrichMember)
  if (q.group) rows = rows.filter((m) => m.group === q.group)
  if (q.gender) rows = rows.filter((m) => m.gender === q.gender)
  if (q.status) rows = rows.filter((m) => m.membership_status === q.status)
  if (q.home_church_id) rows = rows.filter((m) => m.home_church_id === Number(q.home_church_id))
  if (q.q) {
    const s = q.q.toLowerCase()
    rows = rows.filter((m) => m.full_name.toLowerCase().includes(s) || (m.phone || '').includes(s) || (m.email || '').toLowerCase().includes(s))
  }
  return rows.sort((a, b) => a.full_name.localeCompare(b.full_name))
})
route('get', '/members/:id', ({ user, params }) => {
  const m = db.members.find((x) => x.id === params.id)
  if (!m) throw new HttpError(404, 'Member not found')
  if (user.role !== 'bishop' && m.branch_id !== user.branch_id) throw new HttpError(403, 'This member belongs to another branch.')
  const tithes = db.tithes.filter((t) => t.member_id === m.id).sort((a, b) => b.date.localeCompare(a.date))
  const pledges = db.pledges.filter((p) => p.member_id === m.id).map(pledgeView)
  return { ...enrichMember(m), tithes, tithe_total: tithes.reduce((t, x) => t + x.amount, 0), pledges }
})
function memberPayload(body) {
  const first = (body.first_name || '').trim()
  const last = (body.last_name || '').trim()
  if (!first || !last) throw new HttpError(422, 'First and last name are required.')
  if (!body.dob) throw new HttpError(422, 'Date of birth is required — it decides the member group.', { field: 'dob' })
  if (body.phone && !/^(\+?254|0)(7|1)\d{8}$/.test(body.phone.replace(/\s/g, ''))) throw new HttpError(422, 'Phone should look like 0712 345 678.', { field: 'phone' })
  return {
    first_name: first,
    last_name: last,
    full_name: `${first} ${last}`,
    gender: body.gender,
    dob: body.dob,
    phone: (body.phone || '').replace(/\s/g, ''),
    email: body.email || '',
    residence: body.residence || '',
    marital_status: body.marital_status || 'Single',
    single_parent: !!body.single_parent,
    home_church_id: body.home_church_id ? Number(body.home_church_id) : null,
    membership_status: body.membership_status || 'Active',
    joined_on: body.joined_on || iso(TODAY),
    salvation_date: body.salvation_date || null,
    water_baptism_date: body.water_baptism_date || null,
    holy_spirit_baptism: !!body.holy_spirit_baptism,
    dedication_date: body.dedication_date || null,
    occupation: body.occupation || '',
    notes: body.notes || '',
  }
}
route('post', '/members', ({ user, body }) => {
  requireWrite(user)
  const m = { id: nextId(db.members), branch_id: user.branch_id, ...memberPayload(body) }
  db.members.push(m)
  log(user, 'Added member', m.full_name)
  return enrichMember(m)
})
route('put', '/members/:id', ({ user, params, body }) => {
  const m = db.members.find((x) => x.id === params.id)
  if (!m) throw new HttpError(404, 'Member not found')
  requireWrite(user, m.branch_id)
  Object.assign(m, memberPayload(body))
  log(user, 'Updated member', m.full_name)
  return enrichMember(m)
})

route('get', '/tithes', ({ user, q }) => {
  const branch = scopeBranch(user, q.branch_id)
  let rows = db.tithes.filter(inBranch(branch)).filter(inRange(q.from, q.to))
  if (q.member_id) rows = rows.filter((t) => t.member_id === Number(q.member_id))
  return rows.map((t) => ({ ...t, member_name: memberName(t.member_id) })).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
})
route('post', '/tithes', ({ user, body }) => {
  requireWrite(user)
  const m = db.members.find((x) => x.id === Number(body.member_id))
  if (!m) throw new HttpError(422, 'Pick the member from the list.', { field: 'member_id' })
  if (m.branch_id !== user.branch_id) throw new HttpError(403, 'That member belongs to another branch.')
  if (!body.date) throw new HttpError(422, 'Date is required.', { field: 'date' })
  const pay = validatePayment(body)
  const t = { id: nextId(db.tithes), member_id: m.id, branch_id: m.branch_id, date: body.date, ...pay, recorded_by: user.name }
  db.tithes.push(t)
  log(user, 'Recorded tithe', `${m.full_name} · KSh ${pay.amount.toLocaleString()}`)
  return { ...t, member_name: m.full_name }
})
route('delete', '/tithes/:id', ({ user, params }) => {
  const i = db.tithes.findIndex((t) => t.id === params.id)
  if (i < 0) throw new HttpError(404, 'Not found')
  requireWrite(user, db.tithes[i].branch_id)
  const [t] = db.tithes.splice(i, 1)
  log(user, 'Deleted tithe entry', `${memberName(t.member_id)} · ${t.date}`)
  return { ok: true }
})
route('get', '/reports/tithe', ({ user, q }) => {
  const branch = scopeBranch(user, q.branch_id)
  const rows = db.tithes.filter(inBranch(branch)).filter(inRange(q.from, q.to))
  const byMonth = sumBy(rows, (r) => monthKey(r.date))
  const byBranch = sumBy(rows, (r) => r.branch_id)
  const byMethod = sumBy(rows, (r) => r.method)
  const members = {}
  rows.forEach((r) => {
    const x = (members[r.member_id] ||= { member_id: r.member_id, name: memberName(r.member_id), branch_id: r.branch_id, total: 0, count: 0, last_date: r.date })
    x.total += r.amount
    x.count += 1
    if (r.date > x.last_date) x.last_date = r.date
  })
  return {
    total: rows.reduce((t, r) => t + r.amount, 0),
    count: rows.length,
    tithers: Object.keys(members).length,
    by_month: Object.entries(byMonth).sort().map(([month, total]) => ({ month, total })),
    by_branch: BRANCHES.filter((b) => branch === null || b.id === branch).map((b) => ({ branch_id: b.id, total: byBranch[b.id] || 0 })),
    by_method: ['mpesa', 'bank', 'cash'].map((m) => ({ method: m, total: byMethod[m] || 0 })),
    by_member: Object.values(members).sort((a, b) => b.total - a.total),
  }
})

route('get', '/offerings', ({ user, q }) => {
  const branch = scopeBranch(user, q.branch_id)
  return db.offerings.filter(inBranch(branch)).filter(inRange(q.from, q.to)).sort((a, b) => b.date.localeCompare(a.date) || a.branch_id - b.branch_id)
})
route('post', '/offerings', ({ user, body }) => {
  requireWrite(user)
  if (!body.date) throw new HttpError(422, 'Pick the Sunday.', { field: 'date' })
  if (parseISO(body.date).getDay() !== 0) throw new HttpError(422, 'Offering is recorded for the Sunday Main Service — pick a Sunday.', { field: 'date' })
  if (db.offerings.some((o) => o.branch_id === user.branch_id && o.date === body.date)) throw new HttpError(409, 'Offering for that Sunday has already been recorded for this branch.', { field: 'date' })
  const counts = {}
  let cash_total = 0
  Object.entries(body.counts || {}).forEach(([k, v]) => {
    const n = Math.max(0, Math.floor(Number(v) || 0))
    counts[k] = n
    cash_total += Number(k) * n
  })
  const mpesa_total = Number(body.mpesa_total) || 0
  const bank_total = Number(body.bank_total) || 0
  const o = { id: nextId(db.offerings), branch_id: user.branch_id, date: body.date, service: 'Main Service', counts, cash_total, mpesa_total, bank_total, total: cash_total + mpesa_total + bank_total, counted_by: body.counted_by || '', notes: body.notes || '' }
  db.offerings.push(o)
  log(user, 'Recorded Sunday offering', `${body.date} · KSh ${o.total.toLocaleString()}`)
  return o
})
route('get', '/reports/offering', ({ user, q }) => {
  const branch = scopeBranch(user, q.branch_id)
  const rows = db.offerings.filter(inBranch(branch)).filter(inRange(q.from, q.to))
  const byMonth = sumBy(rows, (r) => monthKey(r.date), (r) => r.total)
  const byBranch = sumBy(rows, (r) => r.branch_id, (r) => r.total)
  return {
    total: rows.reduce((t, r) => t + r.total, 0),
    cash: rows.reduce((t, r) => t + r.cash_total, 0),
    mpesa: rows.reduce((t, r) => t + r.mpesa_total, 0),
    bank: rows.reduce((t, r) => t + r.bank_total, 0),
    sundays: new Set(rows.map((r) => r.date)).size,
    by_month: Object.entries(byMonth).sort().map(([month, total]) => ({ month, total })),
    by_branch: BRANCHES.filter((b) => branch === null || b.id === branch).map((b) => ({ branch_id: b.id, total: byBranch[b.id] || 0 })),
  }
})

route('get', '/pledges', ({ user, q }) => {
  const branch = scopeBranch(user, q.branch_id)
  let rows = db.pledges.filter(inBranch(branch)).map(pledgeView)
  if (q.status) rows = rows.filter((p) => p.status === q.status)
  if (q.q) rows = rows.filter((p) => p.member_name.toLowerCase().includes(q.q.toLowerCase()))
  return rows.sort((a, b) => a.member_name.localeCompare(b.member_name))
})
route('post', '/pledges', ({ user, body }) => {
  requireWrite(user)
  const m = db.members.find((x) => x.id === Number(body.member_id))
  if (!m) throw new HttpError(422, 'Pick the member from the list.', { field: 'member_id' })
  if (m.branch_id !== user.branch_id) throw new HttpError(403, 'That member belongs to another branch.')
  const amount = Number(body.amount)
  if (!amount || amount <= 0) throw new HttpError(422, 'Pledge amount must be greater than zero.', { field: 'amount' })
  if (!body.due_date) throw new HttpError(422, 'Set the date it should be paid by.', { field: 'due_date' })
  const p = { id: nextId(db.pledges), member_id: m.id, branch_id: m.branch_id, project: body.project || 'Main Church Building', amount, pledged_on: body.pledged_on || iso(TODAY), due_date: body.due_date, notes: body.notes || '' }
  db.pledges.push(p)
  log(user, 'Recorded pledge', `${m.full_name} · KSh ${amount.toLocaleString()}`)
  return pledgeView(p)
})
route('post', '/pledges/:id/payments', ({ user, params, body }) => {
  const p = db.pledges.find((x) => x.id === params.id)
  if (!p) throw new HttpError(404, 'Pledge not found')
  requireWrite(user, p.branch_id)
  const view = pledgeView(p)
  const pay = validatePayment(body)
  if (pay.amount > view.balance) throw new HttpError(422, `That is more than the balance of KSh ${view.balance.toLocaleString()}.`, { field: 'amount' })
  db.pledgePayments.push({ id: nextId(db.pledgePayments), pledge_id: p.id, date: body.date || iso(TODAY), ...pay })
  log(user, 'Recorded pledge payment', `${view.member_name} · KSh ${pay.amount.toLocaleString()}`)
  return pledgeView(p)
})
route('get', '/building-fund', ({ user, q }) => {
  const branch = scopeBranch(user, q.branch_id)
  const contributions = db.buildingFund.contributions.filter(inBranch(branch)).sort((a, b) => b.date.localeCompare(a.date))
  const pledges = db.pledges.filter(inBranch(branch)).map(pledgeView)
  const direct = contributions.reduce((t, c) => t + c.amount, 0)
  const pledgePaid = pledges.reduce((t, p) => t + p.paid, 0)
  return {
    project: db.buildingFund.project,
    target: db.buildingFund.target,
    target_is_sample: db.buildingFund.target_is_sample,
    raised_total: direct + pledgePaid,
    direct_total: direct,
    pledge_paid_total: pledgePaid,
    pledged_total: pledges.reduce((t, p) => t + p.amount, 0),
    outstanding_total: pledges.reduce((t, p) => t + p.balance, 0),
    contributions,
  }
})
route('post', '/building-fund', ({ user, body }) => {
  requireWrite(user)
  const pay = validatePayment(body)
  const m = body.member_id ? db.members.find((x) => x.id === Number(body.member_id)) : null
  const c = { id: nextId(db.buildingFund.contributions), date: body.date || iso(TODAY), member_id: m?.id ?? null, contributor: m?.full_name || body.contributor || 'Anonymous', branch_id: user.branch_id, ...pay }
  db.buildingFund.contributions.push(c)
  log(user, 'Recorded building fund gift', `${c.contributor} · KSh ${pay.amount.toLocaleString()}`)
  return c
})

route('get', '/cells', ({ user }) => {
  let rows = db.cells
  if (user.role === 'cell_leader') rows = rows.filter((c) => c.id === user.cell_id)
  else if (user.role !== 'bishop') rows = rows.filter((c) => c.branch_id === user.branch_id)
  return rows.map((c) => {
    const reps = db.cellReports.filter((r) => r.cell_id === c.id).sort((a, b) => b.date.localeCompare(a.date))
    const last = reps[0]
    const recent = reps.slice(0, 4)
    return {
      ...c,
      leader: memberName(c.leader_member_id),
      assistant: memberName(c.assistant_member_id),
      members_count: db.members.filter((m) => m.home_church_id === c.id).length,
      last_report_date: last?.date ?? null,
      avg_attendance: recent.length ? Math.round(recent.reduce((t, r) => t + r.adults.length + r.children.length, 0) / recent.length) : 0,
    }
  })
})
route('get', '/cells/:id/roster', ({ user, params }) => {
  const c = db.cells.find((x) => x.id === params.id)
  if (!c) throw new HttpError(404, 'Home church not found')
  if (user.role === 'cell_leader' && user.cell_id !== c.id) throw new HttpError(403, 'Not your home church')
  if (user.role !== 'bishop' && user.role !== 'cell_leader' && c.branch_id !== user.branch_id) throw new HttpError(403, 'Another branch')
  return db.members.filter((m) => m.home_church_id === c.id && m.membership_status === 'Active').map(enrichMember).sort((a, b) => a.full_name.localeCompare(b.full_name))
})
route('get', '/cell-reports', ({ user, q }) => {
  let rows = db.cellReports
  if (user.role === 'cell_leader') rows = rows.filter((r) => r.cell_id === user.cell_id)
  else rows = rows.filter(inBranch(scopeBranch(user, q.branch_id)))
  if (q.cell_id) rows = rows.filter((r) => r.cell_id === Number(q.cell_id))
  rows = rows.filter(inRange(q.from, q.to))
  return rows.map((r) => ({ ...r, cell_name: cellName(r.cell_id) })).sort((a, b) => b.date.localeCompare(a.date) || a.cell_id - b.cell_id)
})
route('post', '/cell-reports', ({ user, body }) => {
  if (!['cell_leader', 'secretary'].includes(user.role)) throw new HttpError(403, 'Only home church leaders submit Thursday reports.')
  const cellId = user.role === 'cell_leader' ? user.cell_id : Number(body.cell_id)
  const c = db.cells.find((x) => x.id === cellId)
  if (!c) throw new HttpError(422, 'Choose the home church.', { field: 'cell_id' })
  if (user.role === 'secretary' && c.branch_id !== user.branch_id) throw new HttpError(403, 'Another branch')
  if (!body.date) throw new HttpError(422, 'Date is required.', { field: 'date' })
  if (db.cellReports.some((r) => r.cell_id === c.id && r.date === body.date)) throw new HttpError(409, 'A report for this home church and date already exists.', { field: 'date' })
  if (!body.signed_by) throw new HttpError(422, "Type the leader's name to sign the report.", { field: 'signed_by' })
  const r = {
    id: nextId(db.cellReports),
    cell_id: c.id,
    branch_id: c.branch_id,
    date: body.date,
    area: body.area || c.area,
    venue: body.venue || '',
    time: body.time || '',
    leader: body.leader || '',
    assistant: body.assistant || '',
    preaching_from: body.preaching_from || '',
    preacher: body.preacher || '',
    worship_leader: body.worship_leader || '',
    adults: (body.adults || []).filter(Boolean),
    children: (body.children || []).filter(Boolean),
    visitors: Number(body.visitors) || 0,
    offering: Number(body.offering) || 0,
    signed_by: body.signed_by,
    submitted_at: new Date().toISOString().slice(0, 19),
  }
  db.cellReports.push(r)
  log(user, 'Submitted Home Church report', `${c.name} · ${r.date}`)
  return { ...r, cell_name: c.name }
})

route('get', '/leaders', ({ user }) => {
  const rows = user.role === 'bishop' ? db.leaders : db.leaders.filter((l) => l.branch_id === user.branch_id || l.role === 'Bishop')
  return rows
})
route('post', '/leaders', ({ user, body }) => {
  requireWrite(user)
  const m = db.members.find((x) => x.id === Number(body.member_id))
  if (!m) throw new HttpError(422, 'Pick the member.', { field: 'member_id' })
  if (!body.role) throw new HttpError(422, 'Enter the role.', { field: 'role' })

  db.leaders
    .filter((l) => l.active && l.role === body.role && l.branch_id === user.branch_id)
    .forEach((l) => {
      l.active = false
      l.until = iso(TODAY)
    })
  const l = { id: nextId(db.leaders), role: body.role, member_id: m.id, name: m.full_name, phone: m.phone, email: m.email, branch_id: user.branch_id, scope: user.branch_id === 1 ? 'church' : 'branch', since: body.since || iso(TODAY), group: body.group || 'Leadership', active: true }
  db.leaders.push(l)
  log(user, 'Updated leadership', `${l.role}: ${l.name}`)
  return l
})
route('get', '/worship-team', ({ user }) => (user.role === 'bishop' ? db.worshipTeam : db.worshipTeam.filter((w) => w.branch_id === user.branch_id)))

route('get', '/inventory', ({ user, q }) => {
  const branch = scopeBranch(user, q.branch_id)
  let rows = db.inventory.filter(inBranch(branch))
  if (q.category) rows = rows.filter((i) => i.category === q.category)
  return rows
})
route('get', '/inventory/:id/history', ({ params }) => db.stockTakes.filter((s) => s.item_id === params.id).sort((a, b) => b.date.localeCompare(a.date)))
function inventoryPayload(body) {
  if (!(body.name || '').trim()) throw new HttpError(422, 'Item name is required.', { field: 'name' })
  const qty = Math.floor(Number(body.quantity))
  if (!(qty >= 0)) throw new HttpError(422, 'Quantity must be 0 or more.', { field: 'quantity' })
  const custodian = body.custodian_member_id ? db.members.find((m) => m.id === Number(body.custodian_member_id)) : null
  return {
    category: body.category,
    name: body.name.trim(),
    brand: body.brand || '',
    model: body.model || '',
    serial_no: body.serial_no || '',
    quantity: qty,
    condition: body.condition || 'Good',
    location: body.location || '',
    custodian_member_id: custodian?.id ?? null,
    custodian: custodian?.full_name ?? '',
    acquired_on: body.acquired_on || null,
    notes: body.notes || '',
  }
}
route('post', '/inventory', ({ user, body }) => {
  requireWrite(user)
  const it = { id: nextId(db.inventory), branch_id: user.branch_id, last_checked: iso(TODAY), ...inventoryPayload(body) }
  db.inventory.push(it)
  log(user, 'Added inventory item', `${it.name} × ${it.quantity}`)
  return it
})
route('put', '/inventory/:id', ({ user, params, body }) => {
  const it = db.inventory.find((x) => x.id === params.id)
  if (!it) throw new HttpError(404, 'Not found')
  requireWrite(user, it.branch_id)
  Object.assign(it, inventoryPayload(body))
  log(user, 'Updated inventory item', it.name)
  return it
})
route('post', '/inventory/:id/stock-take', ({ user, params, body }) => {
  const it = db.inventory.find((x) => x.id === params.id)
  if (!it) throw new HttpError(404, 'Not found')
  requireWrite(user, it.branch_id)
  const counted = Math.floor(Number(body.counted))
  if (!(counted >= 0)) throw new HttpError(422, 'Enter how many you counted.', { field: 'counted' })
  const condition = counted === 0 ? 'Missing' : body.condition || it.condition
  const s = { id: nextId(db.stockTakes), item_id: it.id, date: iso(TODAY), counted, expected: it.quantity, condition, checked_by: user.name, note: body.note || '' }
  db.stockTakes.push(s)
  it.last_checked = s.date
  it.condition = condition
  log(user, 'Stock-take', `${it.name}: counted ${counted} of ${it.quantity}`)
  return it
})

route('get', '/audit', ({ user }) => {
  if (user.role !== 'bishop') throw new HttpError(403, 'Only the Bishop can view the audit log.')
  return db.audit
})

route('get', '/dashboard', ({ user, q }) => {
  const branch = scopeBranch(user, q.branch_id)
  const members = db.members.filter(inBranch(branch)).map(enrichMember)
  const active = members.filter((m) => m.membership_status === 'Active')
  const groups = {}
  active.forEach((m) => (groups[m.group] = (groups[m.group] || 0) + 1))
  const mStart = iso(startOfMonth(TODAY))
  const mEnd = iso(endOfMonth(TODAY))
  const pStart = iso(startOfMonth(subMonths(TODAY, 1)))
  const pEnd = iso(endOfMonth(subMonths(TODAY, 1)))
  const t = db.tithes.filter(inBranch(branch))
  const tSum = (from, to) => t.filter(inRange(from, to)).reduce((s, r) => s + r.amount, 0)
  const o = db.offerings.filter(inBranch(branch))
  const oSum = (from, to) => o.filter(inRange(from, to)).reduce((s, r) => s + r.total, 0)
  const tithe12 = []
  for (let i = 8; i >= 0; i--) {
    const d = subMonths(TODAY, i)
    const k = format(d, 'yyyy-MM')
    tithe12.push({
      month: k,
      tithe: t.filter((r) => r.date.startsWith(k)).reduce((s, r) => s + r.amount, 0),
      offering: o.filter((r) => r.date.startsWith(k)).reduce((s, r) => s + r.total, 0),
    })
  }
  const pledges = db.pledges.filter(inBranch(branch)).map(pledgeView)
  const reports = db.cellReports.filter(inBranch(branch))
  const lastThu = reports.reduce((m, r) => (r.date > m ? r.date : m), '')
  const thisWeek = reports.filter((r) => r.date === lastThu)
  const cellsInScope = db.cells.filter(inBranch(branch))
  const wk = { start: startOfWeek(TODAY, { weekStartsOn: 1 }), end: addDays(endOfWeek(TODAY, { weekStartsOn: 1 }), 7) }
  const birthdays = active
    .filter((m) => {
      const b = parseISO(m.dob)
      const thisYear = new Date(TODAY.getFullYear(), getMonth(b), getDate(b))
      return isWithinInterval(thisYear, { start: TODAY, end: addDays(TODAY, 7) })
    })
    .map((m) => ({ id: m.id, name: m.full_name, dob: m.dob, branch_id: m.branch_id, group: m.group }))
  const bf = db.buildingFund.contributions.filter(inBranch(branch))
  return {
    scope: branch === null ? 'all' : branch,
    members_total: active.length,
    members_inactive: members.length - active.length,
    by_group: groups,
    by_gender: { M: active.filter((m) => m.gender === 'M').length, F: active.filter((m) => m.gender === 'F').length },
    by_branch: BRANCHES.filter((b) => branch === null || b.id === branch).map((b) => ({ branch_id: b.id, members: active.filter((m) => m.branch_id === b.id).length, tithe_month: t.filter((r) => r.branch_id === b.id).filter(inRange(mStart, mEnd)).reduce((s, r) => s + r.amount, 0) })),
    tithe_month: tSum(mStart, mEnd),
    tithe_prev_month: tSum(pStart, pEnd),
    offering_month: oSum(mStart, mEnd),
    offering_prev_month: oSum(pStart, pEnd),
    trend: tithe12,
    pledges: {
      count: pledges.length,
      pledged: pledges.reduce((s, p) => s + p.amount, 0),
      paid: pledges.reduce((s, p) => s + p.paid, 0),
      overdue: pledges.filter((p) => p.status === 'Overdue').length,
    },
    building_fund_raised: bf.reduce((s, c) => s + c.amount, 0) + pledges.reduce((s, p) => s + p.paid, 0),
    building_fund_target: db.buildingFund.target,
    home_church: {
      date: lastThu,
      submitted: thisWeek.length,
      expected: cellsInScope.length,
      adults: thisWeek.reduce((s, r) => s + r.adults.length, 0),
      children: thisWeek.reduce((s, r) => s + r.children.length, 0),
      visitors: thisWeek.reduce((s, r) => s + r.visitors, 0),
      offering: thisWeek.reduce((s, r) => s + r.offering, 0),
      missing: cellsInScope.filter((c) => !thisWeek.some((r) => r.cell_id === c.id)).map((c) => c.name),
    },
    new_members_month: members.filter((m) => m.joined_on >= mStart).length,
    new_believers_month: members.filter((m) => m.salvation_date && m.salvation_date >= mStart).length,
    awaiting_baptism: active.filter((m) => m.salvation_date && !m.water_baptism_date && m.group !== 'sunday_school').length,
    birthdays,
    inventory_alerts: db.inventory.filter(inBranch(branch)).filter((i) => ['Missing', 'Needs repair'].includes(i.condition)).map((i) => ({ id: i.id, name: i.name, condition: i.condition, branch_id: i.branch_id })),
    week_of: iso(wk.start),
  }
})

function parseQuery(config) {
  const q = { ...(config.params || {}) }
  Object.keys(q).forEach((k) => (q[k] === '' || q[k] === undefined || q[k] === null) && delete q[k])
  return q
}

export default async function demoAdapter(config) {
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180))
  const method = (config.method || 'get').toLowerCase()
  const url = (config.url || '').replace(/^\/?api/, '').split('?')[0]
  const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {}
  const respond = (status, data) => ({ data, status, statusText: String(status), headers: {}, config, request: {} })
  try {
    const r = routes.find((x) => x.method === method && x.re.test(url))
    if (!r) throw new HttpError(404, `No demo route for ${method.toUpperCase()} ${url}`)
    const match = url.match(r.re)
    const params = {}
    r.keys.forEach((k, i) => (params[k] = Number(match[i + 1])))
    let user = null
    if (url !== '/auth/login') {
      const auth = (config.headers?.Authorization || config.headers?.authorization || '').replace('Bearer ', '')
      user = DEMO_USERS.find((u) => `demo.${u.id}` === auth)
      if (!user) throw new HttpError(401, 'Session expired — please sign in again.')
    }
    const data = r.handler({ user, params, q: parseQuery(config), body })
    return respond(method === 'post' ? 201 : 200, JSON.parse(JSON.stringify(data)))
  } catch (e) {
    if (!(e instanceof HttpError)) throw e
    const res = respond(e.status, { message: e.message, ...e.extra })
    throw new AxiosError(e.message, String(e.status), config, {}, res)
  }
}
