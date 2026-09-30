import { format, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns'
import { fmtDate, today } from './utils'

export function periodRange(key, custom) {
  const t = today()
  const f = (d) => format(d, 'yyyy-MM-dd')
  switch (key) {
    case 'month':
      return { from: f(startOfMonth(t)), to: f(endOfMonth(t)), label: format(t, 'MMMM yyyy') }
    case 'last_month': {
      const d = subMonths(t, 1)
      return { from: f(startOfMonth(d)), to: f(endOfMonth(d)), label: format(d, 'MMMM yyyy') }
    }
    case '3m':
      return { from: f(startOfMonth(subMonths(t, 2))), to: f(endOfMonth(t)), label: 'Last 3 months' }
    case 'year':
      return { from: f(startOfYear(t)), to: f(endOfMonth(t)), label: `Year ${t.getFullYear()}` }
    case 'custom':
      return { from: custom.from, to: custom.to, label: `${fmtDate(custom.from)} – ${fmtDate(custom.to)}` }
    default:
      return { from: '', to: '', label: 'All time' }
  }
}
