import { differenceInYears, format, parseISO, isValid } from 'date-fns'

export const toDate = (d) => (d instanceof Date ? d : parseISO(d))

export function ageOf(dob, on = today()) {
  if (!dob) return null
  const d = toDate(dob)
  return isValid(d) ? differenceInYears(on, d) : null
}

export function groupFor({ dob, gender, marital_status, single_parent }) {
  const age = ageOf(dob)
  if (age === null) return null
  if (age <= 12) return 'sunday_school'
  if (age <= 19) return 'teens'
  const parentStatus = marital_status === 'Married' || marital_status === 'Widowed' || single_parent
  if (parentStatus) return gender === 'F' ? 'mothers' : 'fathers'
  if (age <= 24) return 'junior_youth'
  return 'senior_youth'
}

const kes = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 })
export const money = (n) => `KSh ${kes.format(Math.round(Number(n) || 0))}`
export const num = (n) => kes.format(Number(n) || 0)
export const compactMoney = (n) => {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `KSh ${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`
  if (v >= 10_000) return `KSh ${Math.round(v / 1000)}K`
  return money(v)
}

export const fmtDate = (d, f = 'd MMM yyyy') => (d ? format(toDate(d), f) : '—')

export const initials = (name = '') =>
  name
    .split(' ')
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

export const cx = (...c) => c.filter(Boolean).join(' ')

export function downloadCSV(filename, rows, columns) {
  const esc = (v) => {
    let s = v === null || v === undefined ? '' : String(v)
    if (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-][\d\s.]*$/.test(s))) s = `'${s}`
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = columns.map((c) => esc(c.label)).join(',')
  const body = rows.map((r) => columns.map((c) => esc(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(','))
  const blob = new Blob(['﻿' + [head, ...body].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function saveBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const homeFor = (user) => (user?.role === 'cell_leader' ? '/home-church' : user?.role === 'dept_leader' ? `/departments/${user.department_id}` : '/')

export const asset = (p) => `${import.meta.env.BASE_URL}${p.replace(/^\//, '')}`

export const today = () => new Date()
