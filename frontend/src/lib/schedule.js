import { addDays, addMonths, differenceInCalendarDays, endOfMonth, startOfMonth } from 'date-fns'
import { MONTHLY_EVENTS } from './constants'

export function firstWeekday(monthDate, weekday) {
  const s = startOfMonth(monthDate)
  return addDays(s, (weekday - s.getDay() + 7) % 7)
}

export function lastWeekday(monthDate, weekday) {
  const e = endOfMonth(monthDate)
  return addDays(e, -((e.getDay() - weekday + 7) % 7))
}

function dateForRule(rule, month) {
  if (rule === 'first-friday') return firstWeekday(month, 5)
  if (rule === 'last-monday') return lastWeekday(month, 1)
  return null
}

export function upcomingMonthly(from) {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return MONTHLY_EVENTS.map((ev) => {
    let d = dateForRule(ev.rule, base)
    if (d < base) d = dateForRule(ev.rule, addMonths(base, 1))
    return { ...ev, date: d, inDays: differenceInCalendarDays(d, base) }
  }).sort((a, b) => a.date - b.date)
}

export function monthlyInMonth(month) {
  return MONTHLY_EVENTS.map((ev) => ({ ...ev, date: dateForRule(ev.rule, month) }))
}
