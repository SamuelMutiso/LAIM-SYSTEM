import { addMonths, format } from 'date-fns'
import { BookOpen, DoorOpen, Flame, HandHeart, Home, Mic2, Moon, Sun, Users } from 'lucide-react'
import { Badge, Card, CardHeader, PageHeader } from '../components/ui'
import { DAYS, WEEKLY_PROGRAMME } from '../lib/constants'
import { monthlyInMonth, upcomingMonthly } from '../lib/schedule'
import { cx, today } from '../lib/utils'

const KIND = {
  prayer: { icon: Flame, tone: 'bg-flame-50 text-flame-700 border-flame-200', dot: 'bg-flame-500' },
  service: { icon: HandHeart, tone: 'bg-altar-600 text-white border-altar-600', dot: 'bg-altar-600' },
  teaching: { icon: BookOpen, tone: 'bg-altar-50 text-altar-700 border-altar-100', dot: 'bg-altar-400' },
  youth: { icon: Users, tone: 'bg-scripture-50 text-scripture-700 border-scripture-100', dot: 'bg-scripture-500' },
  cell: { icon: Home, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
  worship: { icon: Mic2, tone: 'bg-sky-50 text-sky-700 border-sky-100', dot: 'bg-sky-500' },
  visit: { icon: DoorOpen, tone: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500' },
}
const ORDER = [1, 2, 3, 4, 5, 6, 0]

export default function Activities() {
  const t = today()
  const upcoming = upcomingMonthly(t)
  const months = [0, 1, 2].map((i) => addMonths(new Date(t.getFullYear(), t.getMonth(), 1), i))

  return (
    <div>
      <PageHeader eyebrow="Church" title="Activities" subtitle="The church programme from Monday to Monday — plus the monthly keshas." />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {upcoming.map((e) => (
          <Card key={e.title} className="relative overflow-hidden p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-altar-900 to-altar-700" />
            <div className="absolute inset-0 bg-flame-glow opacity-60" />
            <div className="relative flex items-center gap-4 text-white">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/10 text-center leading-none backdrop-blur">
                <div>
                  <div className="text-[10px] font-bold uppercase text-flame-300">{format(e.date, 'MMM')}</div>
                  <div className="font-display text-2xl font-bold">{format(e.date, 'd')}</div>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-flame-300">Next · {e.inDays === 0 ? 'today' : `in ${e.inDays} days`}</div>
                <div className="font-display text-xl font-bold">{e.title}</div>
                <div className="text-sm text-altar-100">
                  {format(e.date, 'EEEE')} · {e.time} · {e.note}
                </div>
              </div>
              <Moon className="h-6 w-6 text-flame-300" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {ORDER.map((d) => {
          const items = WEEKLY_PROGRAMME.filter((p) => p.day === d)
          const isToday = t.getDay() === d
          return (
            <Card key={d} className={cx('p-3', isToday && 'ring-2 ring-flame-400', d === 0 && 'xl:col-span-1')}>
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="font-display font-semibold">{DAYS[d]}</div>
                {isToday && <Badge tone="flame">Today</Badge>}
              </div>
              <div className="space-y-2">
                {items.map((p) => {
                  const K = KIND[p.kind]
                  return (
                    <div key={p.title + p.time} className={cx('rounded-xl border px-3 py-2.5', K.tone)}>
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold leading-tight">
                        <K.icon className="h-3.5 w-3.5 shrink-0" />
                        {p.title}
                      </div>
                      <div className="mt-1 text-[11px] opacity-80">{p.time}</div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sunday order" subtitle="Four services, one morning" action={<Sun className="h-5 w-5 text-flame-500" />} />
          <ol className="relative ml-5 mt-4 border-l-2 border-ink-100 pb-5 pr-5">
            {WEEKLY_PROGRAMME.filter((p) => p.day === 0).map((p) => (
              <li key={p.title} className="mb-5 ml-5 last:mb-0">
                <span className={cx('absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ring-4 ring-white', KIND[p.kind].dot)} />
                <div className="text-xs font-semibold text-ink-500">{p.time}</div>
                <div className="font-semibold">{p.title}</div>
                {p.title === 'Main Service' && <div className="text-xs text-ink-500">Sunday offering is recorded for this service</div>}
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <CardHeader title="Monthly keshas — next 3 months" />
          <div className="mt-3 divide-y divide-ink-100">
            {months.flatMap((m) =>
              monthlyInMonth(m).map((e) => (
                <div key={e.title + m} className={cx('flex items-center gap-4 px-5 py-3', e.date < t && 'opacity-45')}>
                  <div className="w-24 text-sm font-semibold">{format(e.date, 'EEE d MMM')}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{e.title}</div>
                    <div className="text-xs text-ink-500">{e.time}</div>
                  </div>
                  {e.date < t && <span className="text-xs text-ink-400">Done</span>}
                </div>
              )),
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
