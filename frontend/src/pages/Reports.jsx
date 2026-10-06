import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { format } from 'date-fns'
import { Boxes, Building2, CalendarRange, Coins, FileSpreadsheet, HandCoins, Home, Layers, ListChecks, Network, UserRoundCog, Users, Wallet } from 'lucide-react'
import { Reports as Api } from '../api/services'
import { pushToast, selectBranchParam } from '../app/store'
import { Button, Card, PageHeader } from '../components/ui'
import { PeriodPicker } from '../components/PeriodPicker'
import { periodRange } from '../lib/period'
import { branchById } from '../lib/constants'
import { saveBlob, today } from '../lib/utils'

const GROUPS = [
  {
    title: 'People',
    items: [
      { kind: 'members', title: 'Members', desc: 'Everyone on the register — contacts, age group, home church, departments and status.', icon: Users },
      { kind: 'leadership', title: 'Leadership', desc: 'Every leader with their role, phone and group.', icon: UserRoundCog },
      { kind: 'home-churches', title: 'Home churches', desc: 'Each home church with its leader, assistant, venue and number of members.', icon: Home },
      { kind: 'departments', title: 'Departments', desc: 'Each department with its leader, members and when it last reported.', icon: Network },
    ],
  },
  {
    title: 'Giving',
    items: [
      { kind: 'tithe', title: 'Tithe — every entry', desc: 'Date, member, method and M-Pesa code or bank reference for each tithe.', icon: Wallet, dated: true },
      { kind: 'tithe-by-member', title: 'Tithe — by member', desc: 'How many times each member gave and their total for the period.', icon: ListChecks, dated: true },
      { kind: 'offering', title: 'Offering', desc: 'Every service with notes and coins counted, M-Pesa, bank and totals.', icon: Coins, dated: true },
      { kind: 'pledges', title: 'Pledges', desc: 'Each pledge with amount, paid so far, balance and status.', icon: HandCoins, dated: true },
      { kind: 'building-fund', title: 'Building fund', desc: 'Every gift to the building fund with method and reference.', icon: Building2, dated: true },
    ],
  },
  {
    title: 'Church',
    items: [
      { kind: 'home-church-reports', title: 'Home church reports', desc: 'Thursday reports — preacher, worship leader, attendance, visitors and offering.', icon: CalendarRange, dated: true },
      { kind: 'department-reports', title: 'Department reports', desc: 'Activities and reports filed by each department.', icon: Layers, dated: true },
      { kind: 'inventory', title: 'Inventory', desc: 'Every instrument and item — quantity, condition and who is in charge.', icon: Boxes },
    ],
  },
]

export default function Reports() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const branch_id = useSelector(selectBranchParam)
  const [period, setPeriod] = useState('month')
  const [custom, setCustom] = useState({ from: format(today(), 'yyyy-MM-01'), to: format(today(), 'yyyy-MM-dd') })
  const [busy, setBusy] = useState(null)
  const range = periodRange(period, custom)
  const scope = user.role === 'bishop' ? (branch_id ? branchById(branch_id)?.name : 'All branches') : branchById(user.branch_id)?.name

  const download = async (kind, title) => {
    setBusy(kind)
    try {
      const blob = await Api.download(kind, { branch_id: branch_id || undefined, from: range.from || undefined, to: range.to || undefined })
      saveBlob(`LAIM-${kind}-${format(today(), 'yyyy-MM-dd')}.xlsx`, blob)
      dispatch(pushToast(`${title} downloaded`))
    } catch {
      dispatch(pushToast(`Couldn't download ${title.toLowerCase()}. Please try again.`, 'error'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Office" title="Reports" subtitle="Download any record as an Excel file you can open, edit, print or share." />

      <Card className="mb-6 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Dates for giving and activity reports</div>
            <div className="mt-2">
              <PeriodPicker value={period} onChange={setPeriod} custom={custom} onCustom={setCustom} />
            </div>
          </div>
          <div className="text-sm text-ink-500 lg:text-right">
            <div>
              <span className="font-semibold text-ink-900">{scope}</span> · {range.label}
            </div>
            {user.role === 'bishop' && <div className="text-xs">Change the branch at the top of the page.</div>}
          </div>
        </div>
      </Card>

      <Card className="relative mb-8 overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-altar-900 to-altar-700" />
        <div className="absolute inset-0 bg-flame-glow opacity-50" />
        <div className="relative flex flex-col gap-4 text-white sm:flex-row sm:items-center">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 backdrop-blur">
            <FileSpreadsheet className="h-7 w-7 text-flame-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl font-bold">Everything in one Excel file</div>
            <div className="text-sm text-altar-100">All {GROUPS.reduce((n, g) => n + g.items.length, 0)} reports below, each on its own sheet — {scope} · {range.label}.</div>
          </div>
          <Button variant="gold" icon={FileSpreadsheet} loading={busy === 'everything'} disabled={!!busy} onClick={() => download('everything', 'Full report')}>
            Download all
          </Button>
        </div>
      </Card>

      <div className="space-y-8">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.16em] text-ink-400">{g.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((r) => (
                <Card key={r.kind} className="flex flex-col p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-altar-50 text-altar-700">
                      <r.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold leading-snug text-ink-900">{r.title}</h3>
                      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{r.dated ? range.label : 'Current list'}</div>
                    </div>
                  </div>
                  <p className="mt-3 flex-1 text-sm text-ink-500">{r.desc}</p>
                  <div className="mt-4">
                    <Button size="sm" variant="secondary" icon={FileSpreadsheet} loading={busy === r.kind} disabled={!!busy && busy !== r.kind} onClick={() => download(r.kind, r.title)}>
                      Excel
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
