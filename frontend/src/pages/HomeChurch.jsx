import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { format, isThursday, previousThursday } from 'date-fns'
import { CalendarCheck, CheckCircle2, ClipboardPen, Clock, Eye, FileText, Home, MapPin, Plus, Printer, Send, UserRound, Users, X } from 'lucide-react'
import { HomeChurch as Api } from '../api/services'
import { errorField, errorMessage } from '../api/client'
import { useApi, useMutation } from '../app/hooks'
import { selectBranchParam } from '../app/store'
import { Avatar, Badge, BranchTag, Button, Card, CardHeader, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Select } from '../components/ui'
import { LogoMark } from '../components/Brand'
import { ageOf, cx, fmtDate, money, today } from '../lib/utils'

const lastThursday = () => {
  const t = today()
  return isThursday(t) ? t : previousThursday(t)
}

export default function HomeChurchPage() {
  const user = useSelector((s) => s.auth.user)
  return user.role === 'cell_leader' ? <LeaderView user={user} /> : <OfficeView user={user} />
}

function LeaderView({ user }) {
  const { data: cells } = useApi(() => Api.cells(), [])
  const { data: reports, loading } = useApi(() => Api.reports({}), [])
  const [viewing, setViewing] = useState(null)
  const cell = cells?.[0]
  const thisWeek = format(lastThursday(), 'yyyy-MM-dd')
  const doneThisWeek = reports?.some((r) => r.date === thisWeek)

  return (
    <div>
      <PageHeader eyebrow="Home Church · Thursdays 6–7 PM" title={cell ? `${cell.name} Home Church` : 'Home Church'} subtitle={cell ? `${cell.area} · Leader: ${user.name}` : ''} />
      {cell && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-altar-50 text-altar-600">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <div className="num text-2xl font-semibold">{cell.members_count}</div>
              <div className="text-xs text-ink-500">Members in this home church</div>
            </div>
          </Card>
          <Card className="flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-flame-50 text-flame-700">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <div>
              <div className="num text-2xl font-semibold">{cell.avg_attendance}</div>
              <div className="text-xs text-ink-500">Average attendance (last 4 weeks)</div>
            </div>
          </Card>
          <Card className={cx('flex items-center gap-4 p-5', doneThisWeek ? '' : 'ring-2 ring-flame-300')}>
            <span className={cx('grid h-11 w-11 place-items-center rounded-2xl', doneThisWeek ? 'bg-emerald-50 text-emerald-700' : 'bg-scripture-50 text-scripture-600')}>
              {doneThisWeek ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </span>
            <div>
              <div className="font-semibold">{doneThisWeek ? 'Submitted' : 'Not submitted yet'}</div>
              <div className="text-xs text-ink-500">Report for {fmtDate(thisWeek, 'EEEE d MMM')}</div>
            </div>
          </Card>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {cell && <ReportForm cells={[cell]} fixedCell={cell} leaderName={user.name} doneDates={(reports || []).map((r) => r.date)} />}
        <Card>
          <CardHeader title="Past reports" subtitle="Your submitted Thursday reports" />
          <div className="mt-3 divide-y divide-ink-100">
            {loading && <Loading rows={4} />}
            {(reports || []).map((r) => (
              <button key={r.id} onClick={() => setViewing(r)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-altar-50/40">
                <FileText className="h-4 w-4 text-ink-400" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{fmtDate(r.date, 'EEE d MMM yyyy')}</div>
                  <div className="text-xs text-ink-500">
                    {r.adults.length} adults · {r.children.length} children · {r.visitors} visitors
                  </div>
                </div>
                <span className="num text-sm font-semibold">{money(r.offering)}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
      <ReportView report={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

function OfficeView({ user }) {
  const branch_id = useSelector(selectBranchParam)
  const { data: allCells, loading } = useApi(() => Api.cells(), [])
  const cells = (allCells || []).filter((c) => !branch_id || c.branch_id === Number(branch_id))
  const [cellFilter, setCellFilter] = useState('')
  const { data: reports } = useApi(() => Api.reports({ branch_id, cell_id: cellFilter }), [branch_id, cellFilter])
  const [viewing, setViewing] = useState(null)
  const [filling, setFilling] = useState(false)
  const thisWeek = format(lastThursday(), 'yyyy-MM-dd')

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Home Church"
        subtitle="Thursday home church cells (6–7 PM). Each cell leader fills their report online — no paper to lose."
        actions={
          user.role === 'secretary' && (
            <Button icon={Plus} variant="secondary" onClick={() => setFilling(true)}>
              Fill a report for a cell
            </Button>
          )
        }
      />
      {loading ? (
        <Card>
          <Loading />
        </Card>
      ) : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cells.map((c) => {
            const done = c.last_report_date === thisWeek
            return (
              <Card key={c.id} className="group p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-altar-600 text-white">
                      <Home className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="font-display text-lg font-semibold">{c.name}</div>
                      <div className="flex items-center gap-1 text-xs text-ink-500">
                        <MapPin className="h-3 w-3" /> {c.area}
                      </div>
                    </div>
                  </div>
                  {user.role === 'bishop' && <BranchTag id={c.branch_id} />}
                </div>
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-ink-700">
                    <UserRound className="h-3.5 w-3.5 text-ink-400" /> <span className="text-ink-500">Leader</span> <span className="ml-auto font-medium">{c.leader}</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-700">
                    <UserRound className="h-3.5 w-3.5 text-ink-400" /> <span className="text-ink-500">Assistant</span> <span className="ml-auto font-medium">{c.assistant}</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-linen px-3 py-2">
                    <div className="num font-semibold">{c.members_count}</div>
                    <div className="text-[11px] text-ink-500">members</div>
                  </div>
                  <div className="rounded-xl bg-linen px-3 py-2">
                    <div className="num font-semibold">{c.avg_attendance}</div>
                    <div className="text-[11px] text-ink-500">avg attendance</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Badge tone={done ? 'green' : 'flame'}>{done ? 'This week’s report in' : 'Waiting for this week'}</Badge>
                  <button onClick={() => setCellFilter(String(c.id))} className="text-xs font-semibold text-altar-600 hover:text-altar-800">
                    Reports →
                  </button>
                </div>
              </Card>
            )
          })}
          <Card className="flex flex-col items-center justify-center border-dashed p-5 text-center">
            <ClipboardPen className="mb-2 h-6 w-6 text-ink-300" />
            <div className="text-sm font-semibold text-ink-700">Home church list</div>
            <p className="mt-1 text-xs text-ink-500">These cells are sample names. The real list will be loaded when it’s ready.</p>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader
          title="Thursday reports"
          subtitle="Newest first"
          action={
            <div className="w-52">
              <Select value={cellFilter} onChange={(e) => setCellFilter(e.target.value)} className="h-9 py-1.5" aria-label="Filter by home church">
                <option value="">All home churches</option>
                {cells.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          }
        />
        <div className="mt-3 overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[760px]">
            <thead className="bg-linen/60">
              <tr>
                <th className="th">Thursday</th>
                <th className="th">Home church</th>
                <th className="th">Preaching from</th>
                <th className="th text-right">Adults</th>
                <th className="th text-right">Children</th>
                <th className="th text-right">Visitors</th>
                <th className="th text-right">Offering</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody>
              {(reports || []).slice(0, 60).map((r) => (
                <tr key={r.id} className="border-t border-ink-100 hover:bg-altar-50/30">
                  <td className="td whitespace-nowrap">{fmtDate(r.date, 'd MMM yyyy')}</td>
                  <td className="td font-semibold text-ink-900">
                    {r.cell_name}
                    {user.role === 'bishop' && (
                      <span className="ml-2">
                        <BranchTag id={r.branch_id} />
                      </span>
                    )}
                  </td>
                  <td className="td">{r.preaching_from}</td>
                  <td className="td num text-right">{r.adults.length}</td>
                  <td className="td num text-right">{r.children.length}</td>
                  <td className="td num text-right">{r.visitors}</td>
                  <td className="td num text-right font-semibold">{money(r.offering)}</td>
                  <td className="td text-right">
                    <Button size="sm" variant="ghost" icon={Eye} onClick={() => setViewing(r)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reports?.length === 0 && <Empty icon={FileText} title="No reports yet" />}
        </div>
      </Card>
      <ReportView report={viewing} onClose={() => setViewing(null)} />
      <Modal open={filling} onClose={() => setFilling(false)} title="Fill a Home Church report" subtitle="For when a cell leader can’t submit online" width="max-w-3xl">
        <ReportForm cells={cells.filter((c) => c.branch_id === user.branch_id)} onDone={() => setFilling(false)} embedded />
      </Modal>
    </div>
  )
}

function ReportForm({ cells, fixedCell, leaderName, doneDates = [], onDone, embedded }) {
  const areas = useMemo(() => [...new Set(cells.map((c) => c.area))], [cells])
  const initialCell = fixedCell || cells[0]
  const defaults = {
    cell_id: initialCell?.id ?? '',
    date: format(lastThursday(), 'yyyy-MM-dd'),
    area: initialCell?.area ?? '',
    venue: initialCell?.venue ?? '',
    time: '18:00',
    leader: initialCell?.leader ?? leaderName ?? '',
    assistant: initialCell?.assistant ?? '',
    preaching_from: '',
    preacher: '',
    worship_leader: '',
    visitors: 0,
    offering: '',
    signed_by: '',
  }
  const { register, handleSubmit, watch, reset, setError, setValue, formState } = useForm({ defaultValues: defaults })
  const cellId = Number(watch('cell_id'))
  const { data: roster } = useApi(() => (cellId ? Api.roster(cellId) : Promise.resolve([])), [cellId])
  const [present, setPresent] = useState(new Set())
  const [extraAdults, setExtraAdults] = useState([])
  const [extraKids, setExtraKids] = useState([])
  const [extraName, setExtraName] = useState('')
  const [extraKind, setExtraKind] = useState('adult')
  const [serverError, setServerError] = useState(null)
  const [done, setDone] = useState(false)
  const [save, busy] = useMutation(Api.submit, { success: 'Home Church report submitted — thank you!' })

  useEffect(() => {
    const c = cells.find((x) => x.id === cellId)
    if (c && !fixedCell) {
      setValue('area', c.area)
      setValue('venue', c.venue)
      setValue('leader', c.leader)
      setValue('assistant', c.assistant)
    }
    setPresent(new Set())

  }, [cellId])

  const adultsRoster = (roster || []).filter((m) => ageOf(m.dob) >= 13)
  const kidsRoster = (roster || []).filter((m) => {
    const a = ageOf(m.dob)
    return a > 3 && a < 13
  })
  const toggle = (name) =>
    setPresent((s) => {
      const n = new Set(s)
      n.has(name) ? n.delete(name) : n.add(name)
      return n
    })
  const adults = [...adultsRoster.filter((m) => present.has(m.full_name)).map((m) => m.full_name), ...extraAdults]
  const children = [...kidsRoster.filter((m) => present.has(m.full_name)).map((m) => m.full_name), ...extraKids]
  const date = watch('date')
  const already = doneDates.includes(date)

  const addExtra = () => {
    const n = extraName.trim()
    if (!n) return
    extraKind === 'adult' ? setExtraAdults((a) => [...a, n]) : setExtraKids((a) => [...a, n])
    setExtraName('')
  }

  const onSubmit = async (body) => {
    setServerError(null)
    const { error } = await save({ ...body, adults, children })
    if (error) {
      const f = errorField(error)
      if (f) setError(f, { message: errorMessage(error) })
      else setServerError(errorMessage(error))
      return
    }
    reset(defaults)
    setPresent(new Set())
    setExtraAdults([])
    setExtraKids([])
    setDone(true)
    onDone?.()
  }
  const err = (k) => formState.errors[k]?.message

  if (done && !embedded)
    return (
      <Card className="flex flex-col items-center justify-center p-10 text-center">
        <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h3 className="text-xl font-bold">Report submitted</h3>
        <p className="mt-1 max-w-sm text-sm text-ink-500">Your pastor and the Bishop can now see it. God bless you for serving.</p>
        <Button className="mt-5" variant="secondary" onClick={() => setDone(false)}>
          Fill another report
        </Button>
      </Card>
    )

  const Wrapper = embedded ? 'div' : Card
  return (
    <Wrapper className={embedded ? '' : 'overflow-hidden'}>
      {!embedded && (
        <div className="flex items-center gap-4 border-b border-ink-100 bg-linen/60 px-6 py-4">
          <LogoMark className="h-10 w-12" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-scripture-600">Lord’s Altar International Ministry Church</div>
            <div className="font-display text-lg font-bold">Home Church Report</div>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className={cx('space-y-5', !embedded && 'p-6')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" error={err('date') || (already ? 'You already submitted a report for this date' : '')}>
            <Input type="date" {...register('date', { required: 'Required' })} error={err('date') || already} />
          </Field>
          {fixedCell ? (
            <Field label="Home church name">
              <Input value={fixedCell.name} disabled />
            </Field>
          ) : (
            <Field label="Home church name">
              <Select {...register('cell_id')}>
                {cells.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Area">
            <Select {...register('area')}>
              {areas.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          </Field>
          <Field label="Meeting venue">
            <Input {...register('venue')} placeholder="Whose home / place" />
          </Field>
          <Field label="Time">
            <Input type="time" {...register('time')} />
          </Field>
          <Field label="Leader">
            <Input {...register('leader')} />
          </Field>
          <Field label="Assistant">
            <Input {...register('assistant')} />
          </Field>
          <Field label="Praise & worship led by">
            <Input {...register('worship_leader')} />
          </Field>
          <Field label="Preaching from" hint="Scripture, e.g. John 15:1-8">
            <Input {...register('preaching_from')} />
          </Field>
          <Field label="Preached by">
            <Input {...register('preacher')} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="label mb-0">Attendance — tap who came</span>
            <span className="num text-xs font-semibold text-altar-700">
              {adults.length} adults · {children.length} children
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AttendanceList title="Adults" people={adultsRoster} present={present} toggle={toggle} extra={extraAdults} removeExtra={(i) => setExtraAdults((a) => a.filter((_, j) => j !== i))} />
            <AttendanceList title="Children (above 3 years)" people={kidsRoster} present={present} toggle={toggle} extra={extraKids} removeExtra={(i) => setExtraKids((a) => a.filter((_, j) => j !== i))} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input value={extraName} onChange={(e) => setExtraName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExtra())} placeholder="Someone not on the list? Type their name" />
            <Select value={extraKind} onChange={(e) => setExtraKind(e.target.value)} className="sm:w-36">
              <option value="adult">Adult</option>
              <option value="child">Child</option>
            </Select>
            <Button type="button" variant="secondary" icon={Plus} onClick={addExtra}>
              Add
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="No. of visitors">
            <Input type="number" min="0" className="num" {...register('visitors')} />
          </Field>
          <Field label="Offering (KSh)">
            <Input type="number" min="0" className="num" {...register('offering')} />
          </Field>
        </div>
        <Field label="Leader’s sign" error={err('signed_by')} hint="Type your full name to sign this report">
          <Input {...register('signed_by', { required: 'Type your name to sign' })} error={err('signed_by')} className="font-display italic" />
        </Field>
        <ErrorNote>{serverError}</ErrorNote>
        <Button type="submit" size="lg" icon={Send} loading={busy} className="w-full" disabled={already}>
          Submit report
        </Button>
      </form>
    </Wrapper>
  )
}

function AttendanceList({ title, people, present, toggle, extra, removeExtra }) {
  return (
    <div className="rounded-2xl border border-ink-200">
      <div className="border-b border-ink-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-500">{title}</div>
      <div className="max-h-64 overflow-y-auto p-2 scrollbar-thin">
        {people.length === 0 && extra.length === 0 && <div className="px-2 py-3 text-xs text-ink-400">No one listed</div>}
        {people.map((m) => {
          const on = present.has(m.full_name)
          return (
            <button type="button" key={m.id} onClick={() => toggle(m.full_name)} className={cx('flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm transition', on ? 'bg-altar-50' : 'hover:bg-ink-100/60')}>
              <span className={cx('grid h-5 w-5 place-items-center rounded-md border', on ? 'border-altar-600 bg-altar-600 text-white' : 'border-ink-300')}>{on && <CheckCircle2 className="h-3.5 w-3.5" />}</span>
              <Avatar name={m.full_name} size={24} />
              <span className={cx('flex-1', on ? 'font-semibold text-ink-900' : 'text-ink-700')}>{m.full_name}</span>
            </button>
          )
        })}
        {extra.map((n, i) => (
          <div key={n + i} className="flex items-center gap-3 rounded-xl bg-flame-50 px-2 py-1.5 text-sm">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-flame-500 text-white">
              <Plus className="h-3 w-3" />
            </span>
            <span className="flex-1 font-semibold">{n}</span>
            <button type="button" onClick={() => removeExtra(i)} className="text-ink-400 hover:text-ink-700" aria-label={`Remove ${n}`}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReportView({ report: r, onClose }) {
  return (
    <Modal open={!!r} onClose={onClose} title="Home Church Report" subtitle={r ? `${r.cell_name} · ${fmtDate(r.date, 'EEEE d MMMM yyyy')}` : ''} width="max-w-2xl" footer={<Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print</Button>}>
      {r && (
        <div className="text-sm">
          <div className="mb-5 flex flex-col items-center text-center">
            <LogoMark className="h-14 w-16" />
            <div className="mt-2 font-display text-base font-bold uppercase tracking-wide">Lord’s Altar International Ministry Church — {r.cell_name}</div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              ['Area', r.area],
              ['Meeting venue', r.venue],
              ['Time', r.time],
              ['Home church', r.cell_name],
              ['Leader', r.leader],
              ['Assistant', r.assistant],
              ['Preaching from', r.preaching_from],
              ['By', r.preacher],
              ['Praise & worship led by', r.worship_leader],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-dotted border-ink-300 pb-1">
                <dt className="text-[11px] font-semibold uppercase text-ink-400">{k}</dt>
                <dd className="font-medium text-ink-900">{v || '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-ink-300">
            {[
              ['Adults', r.adults],
              ['Children (above 3 years)', r.children],
            ].map(([k, list], i) => (
              <div key={k} className={cx(i === 1 && 'border-l border-ink-300')}>
                <div className="border-b border-ink-300 bg-linen px-3 py-2 text-xs font-bold uppercase">{k}</div>
                <ol className="space-y-1 px-3 py-2">
                  {list.length === 0 && <li className="text-ink-400">—</li>}
                  {list.map((n, j) => (
                    <li key={n + j} className="flex gap-2">
                      <span className="num w-5 text-ink-400">{j + 1}.</span>
                      {n}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-linen p-3">
              <div className="text-[11px] font-semibold uppercase text-ink-500">Visitors</div>
              <div className="num font-semibold">{r.visitors}</div>
            </div>
            <div className="rounded-xl bg-linen p-3">
              <div className="text-[11px] font-semibold uppercase text-ink-500">Offering</div>
              <div className="num font-semibold">{money(r.offering)}</div>
            </div>
            <div className="rounded-xl bg-linen p-3">
              <div className="text-[11px] font-semibold uppercase text-ink-500">Leader’s sign</div>
              <div className="font-display italic">{r.signed_by}</div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
