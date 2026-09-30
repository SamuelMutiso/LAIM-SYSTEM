import { useMemo, useState } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, isSunday, nextSunday } from 'date-fns'
import { periodRange } from '../lib/period'
import { PeriodPicker } from '../components/PeriodPicker'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Banknote, Download, Landmark, ListOrdered, Plus, Printer, Smartphone, Trash2, Wallet } from 'lucide-react'
import { Members, Tithes } from '../api/services'
import { errorField, errorMessage } from '../api/client'
import { useApi, useMutation } from '../app/hooks'
import { selectBranchParam, selectCanWrite } from '../app/store'
import { Avatar, BranchTag, Button, Card, CardHeader, Empty, ErrorNote, Field, Input, Loading, MemberPicker, Modal, PageHeader, ReadOnlyNote, SearchBox, Select, Stat, Tabs } from '../components/ui'
import { PAYMENT_METHODS, branchById } from '../lib/constants'
import { cx, downloadCSV, fmtDate, money, today } from '../lib/utils'

const METHOD_ICON = { mpesa: Smartphone, bank: Landmark, cash: Banknote }
const methodLabel = (m) => PAYMENT_METHODS.find((x) => x.key === m)?.label

export default function Tithe() {
  const user = useSelector((s) => s.auth.user)
  const canWrite = useSelector(selectCanWrite)
  const [tab, setTab] = useState('reports')
  const [recording, setRecording] = useState(false)
  return (
    <div>
      <PageHeader
        eyebrow="Giving"
        title="Tithe"
        subtitle="Recorded every first Sunday of the month — by member, with M-Pesa code, bank reference or cash."
        actions={
          canWrite && (
            <Button icon={Plus} onClick={() => setRecording(true)}>
              Record tithe
            </Button>
          )
        }
      />
      {!canWrite && (
        <div className="mb-4">
          <ReadOnlyNote role={user.role} />
        </div>
      )}
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'reports', label: 'Reports', icon: BarChart3 },
          { key: 'entries', label: 'All entries', icon: ListOrdered },
        ]}
      />
      {tab === 'reports' ? <TitheReports /> : <TitheEntries canWrite={canWrite} />}
      <RecordTithe open={recording} onClose={() => setRecording(false)} />
    </div>
  )
}

function TitheReports() {
  const branch_id = useSelector(selectBranchParam)
  const isBishop = useSelector((s) => s.auth.user.role === 'bishop')
  const [period, setPeriod] = useState('year')
  const [custom, setCustom] = useState({ from: '2026-01-01', to: format(today(), 'yyyy-MM-dd') })
  const [q, setQ] = useState('')
  const [person, setPerson] = useState(null)
  const range = periodRange(period, custom)
  const { data, loading } = useApi(() => Tithes.report({ branch_id, from: range.from, to: range.to }), [branch_id, range.from, range.to])
  const { data: statement } = useApi(() => (person ? Tithes.list({ member_id: person.member_id, from: range.from, to: range.to }) : Promise.resolve(null)), [person?.member_id, range.from, range.to])

  const people = useMemo(() => (data?.by_member || []).filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase())), [data, q])

  const exportCsv = () =>
    downloadCSV(`LAIM-tithe-by-member-${range.label}.csv`, people, [
      { label: 'Member', key: 'name' },
      { label: 'Branch', get: (r) => branchById(r.branch_id)?.name },
      { label: 'Times given', key: 'count' },
      { label: 'Last given', key: 'last_date' },
      { label: 'Total (KSh)', key: 'total' },
    ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PeriodPicker value={period} onChange={setPeriod} custom={custom} onCustom={setCustom} />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="secondary" size="sm" icon={Download} onClick={exportCsv}>
            Export
          </Button>
        </div>
      </div>
      {loading || !data ? (
        <Card>
          <Loading />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={`Total · ${range.label}`} value={money(data.total)} icon={Wallet} tone="flame" />
            <Stat label="Members who gave" value={data.tithers} sub={`${data.count} entries`} />
            {data.by_method.map((m) => {
              const I = METHOD_ICON[m.method]
              return m.method === 'cash' ? null : <Stat key={m.method} label={`Via ${methodLabel(m.method)}`} value={money(m.total)} icon={I} tone="ink" sub={data.total ? `${Math.round((m.total / data.total) * 100)}% of total` : ''} />
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Tithe per month" subtitle={range.label} />
              <div className="h-64 px-2 pb-4 pt-4">
                {data.by_month.length === 0 ? (
                  <Empty title="No tithe in this period" />
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={data.by_month} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#EEEEEA" />
                      <XAxis dataKey="month" tickFormatter={(m) => format(parseISO(m + '-01'), 'MMM yy')} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B6E6B' }} />
                      <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}K`} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8E918D', fontFamily: 'JetBrains Mono' }} width={40} />
                      <Tooltip cursor={{ fill: 'rgba(59,64,176,.06)' }} formatter={(v) => [money(v), 'Tithe']} labelFormatter={(m) => format(parseISO(m + '-01'), 'MMMM yyyy')} contentStyle={{ borderRadius: 12, border: '1px solid #DEDFDA', fontSize: 12 }} />
                      <Bar isAnimationActive={false} dataKey="total" fill="#3B40B0" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title={isBishop && !branch_id ? 'By branch' : 'Payment method'} subtitle={range.label} />
              <div className="space-y-4 px-5 pb-5 pt-4">
                {(isBishop && !branch_id ? data.by_branch.map((b) => ({ key: b.branch_id, label: branchById(b.branch_id).name, total: b.total })) : data.by_method.map((m) => ({ key: m.method, label: methodLabel(m.method), total: m.total }))).map((r) => (
                  <div key={r.key}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-ink-700">{r.label}</span>
                      <span className="num font-semibold">{money(r.total)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-altar-500" style={{ width: `${data.total ? (r.total / data.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader title="Per member" subtitle="Click a name to see their statement" action={<SearchBox value={q} onChange={setQ} placeholder="Find member…" className="w-48" />} />
              <div className="mt-3 max-h-[520px] overflow-auto scrollbar-thin">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white">
                    <tr>
                      <th className="th">Member</th>
                      {isBishop && <th className="th">Branch</th>}
                      <th className="th text-right">Times</th>
                      <th className="th text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((p) => (
                      <tr key={p.member_id} onClick={() => setPerson(p)} className={cx('cursor-pointer border-t border-ink-100 hover:bg-altar-50/40', person?.member_id === p.member_id && 'bg-altar-50')}>
                        <td className="td">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={p.name} size={28} />
                            <span className="font-semibold text-ink-900">{p.name}</span>
                          </div>
                        </td>
                        {isBishop && (
                          <td className="td">
                            <BranchTag id={p.branch_id} />
                          </td>
                        )}
                        <td className="td num text-right">{p.count}</td>
                        <td className="td num text-right font-semibold text-ink-900">{money(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card className="xl:col-span-2">
              {!person ? (
                <Empty icon={Wallet} title="Member statement" body="Pick a member on the left to see every tithe they gave in this period." />
              ) : (
                <div>
                  <div className="flex items-center gap-3 border-b border-ink-100 p-5">
                    <Avatar name={person.name} size={44} />
                    <div className="flex-1">
                      <div className="font-display font-semibold">{person.name}</div>
                      <div className="text-xs text-ink-500">
                        {branchById(person.branch_id).name} · {range.label}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="num text-lg font-semibold text-altar-700">{money(person.total)}</div>
                      <div className="text-[11px] text-ink-500">{person.count} times</div>
                    </div>
                  </div>
                  <div className="max-h-[440px] divide-y divide-ink-100 overflow-auto scrollbar-thin">
                    {(statement || []).map((t) => {
                      const I = METHOD_ICON[t.method]
                      return (
                        <div key={t.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                          <I className="h-4 w-4 text-ink-400" />
                          <div className="flex-1">
                            <div className="font-medium">{fmtDate(t.date, 'EEE d MMM yyyy')}</div>
                            <div className="num text-xs text-ink-500">{t.reference || 'Cash'}</div>
                          </div>
                          <span className="num font-semibold">{money(t.amount)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function TitheEntries({ canWrite }) {
  const branch_id = useSelector(selectBranchParam)
  const isBishop = useSelector((s) => s.auth.user.role === 'bishop')
  const [month, setMonth] = useState(format(today(), 'yyyy-MM'))
  const [method, setMethod] = useState('')
  const [q, setQ] = useState('')
  const from = month ? `${month}-01` : ''
  const to = month ? format(endOfMonth(parseISO(from)), 'yyyy-MM-dd') : ''
  const { data, loading } = useApi(() => Tithes.list({ branch_id, from, to }), [branch_id, from, to])
  const [remove] = useMutation((id) => Tithes.remove(id), { success: 'Entry deleted' })
  const [armed, setArmed] = useState(null)
  const rows = (data || []).filter((t) => (!method || t.method === method) && (!q || t.member_name.toLowerCase().includes(q.toLowerCase()) || (t.reference || '').includes(q.toUpperCase())))
  const total = rows.reduce((s, t) => s + t.amount, 0)

  return (
    <Card>
      <div className="grid gap-3 border-b border-ink-100 p-4 sm:grid-cols-[1fr_170px_160px]">
        <SearchBox value={q} onChange={setQ} placeholder="Search name or M-Pesa code…" />
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month" />
        <Select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Method">
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>
      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty icon={Wallet} title="No tithe entries" body="Nothing recorded for this month yet." />
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[720px]">
            <thead className="bg-linen/60">
              <tr>
                <th className="th">Date</th>
                <th className="th">Member</th>
                <th className="th">Method</th>
                <th className="th">Reference</th>
                {isBishop && <th className="th">Branch</th>}
                <th className="th text-right">Amount</th>
                {canWrite && <th className="th" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const I = METHOD_ICON[t.method]
                return (
                  <tr key={t.id} className="border-t border-ink-100">
                    <td className="td whitespace-nowrap">{fmtDate(t.date)}</td>
                    <td className="td font-semibold text-ink-900">{t.member_name}</td>
                    <td className="td">
                      <span className="inline-flex items-center gap-1.5">
                        <I className="h-3.5 w-3.5 text-ink-400" />
                        {methodLabel(t.method)}
                      </span>
                    </td>
                    <td className="td num text-xs">{t.reference || '—'}</td>
                    {isBishop && (
                      <td className="td">
                        <BranchTag id={t.branch_id} />
                      </td>
                    )}
                    <td className="td num text-right font-semibold text-ink-900">{money(t.amount)}</td>
                    {canWrite && (
                      <td className="td text-right">
                        {armed === t.id ? (
                          <span className="inline-flex gap-1">
                            <button onClick={() => (remove(t.id), setArmed(null))} className="rounded-lg bg-scripture-600 px-2 py-1 text-xs font-semibold text-white">
                              Delete
                            </button>
                            <button onClick={() => setArmed(null)} className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-500 hover:bg-ink-100">
                              Keep
                            </button>
                          </span>
                        ) : (
                          <button onClick={() => setArmed(t.id)} className="rounded-lg p-1.5 text-ink-400 hover:bg-scripture-50 hover:text-scripture-600" aria-label={`Delete ${t.member_name}'s entry`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink-200 bg-linen/60">
                <td className="td font-semibold" colSpan={isBishop ? 5 : 4}>
                  {rows.length} entries
                </td>
                <td className="td num text-right text-base font-bold text-ink-900">{money(total)}</td>
                {canWrite && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  )
}

const firstSundayOf = (d) => {
  const s = startOfMonth(d)
  return isSunday(s) ? s : nextSunday(s)
}

function RecordTithe({ open, onClose }) {
  const { data: members } = useApi(() => (open ? Members.list({ status: 'Active' }) : Promise.resolve([])), [open])
  const defaults = { member_id: '', date: format(firstSundayOf(today()), 'yyyy-MM-dd'), method: 'mpesa', reference: '', amount: '' }
  const { register, handleSubmit, watch, setValue, reset, setError, clearErrors, formState } = useForm({ defaultValues: defaults })
  const [serverError, setServerError] = useState(null)
  const [save, busy] = useMutation(Tithes.create, { success: (t) => `Tithe recorded for ${t.member_name}` })
  const method = watch('method')
  const memberId = watch('member_id')
  register('member_id', { required: 'Pick the member' })

  const submit = (again) => async (body) => {
    setServerError(null)
    const { error } = await save(body)
    if (error) {
      const f = errorField(error)
      if (f) setError(f, { message: errorMessage(error) })
      else setServerError(errorMessage(error))
      return
    }
    reset({ ...defaults, date: body.date, method: body.method })
    if (!again) onClose()
  }
  const err = (k) => formState.errors[k]?.message
  const refLabel = PAYMENT_METHODS.find((m) => m.key === method)?.refLabel

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record tithe"
      subtitle="One entry per member. The same M-Pesa code can’t be used twice."
      width="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={handleSubmit(submit(true))} loading={busy}>
            Save & add another
          </Button>
          <Button onClick={handleSubmit(submit(false))} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit(false))}>
        <Field label="Member" error={err('member_id')}>
          <MemberPicker
            members={members || []}
            value={memberId}
            error={err('member_id')}
            onChange={(id) => {
              setValue('member_id', id)
              clearErrors('member_id')
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sunday" error={err('date')} hint="Defaults to the first Sunday of the month">
            <Input type="date" {...register('date', { required: 'Required' })} error={err('date')} />
          </Field>
          <Field label="Amount (KSh)" error={err('amount')}>
            <Input type="number" min="1" step="1" inputMode="numeric" className="num" {...register('amount', { required: 'Enter the amount' })} error={err('amount')} />
          </Field>
        </div>
        <Field label="Paid via">
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => {
              const I = METHOD_ICON[m.key]
              return (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => {
                    setValue('method', m.key)
                    clearErrors('reference')
                  }}
                  className={cx('flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition', method === m.key ? 'border-altar-600 bg-altar-50 text-altar-700 ring-2 ring-altar-100' : 'border-ink-200 text-ink-600 hover:border-ink-300')}
                >
                  <I className="h-4 w-4" /> {m.label}
                </button>
              )
            })}
          </div>
        </Field>
        {refLabel && (
          <Field label={refLabel} error={err('reference')} hint={method === 'mpesa' ? '10 characters from the M-Pesa message, e.g. UJK4H7X2PQ' : undefined}>
            <Input className="num uppercase" {...register('reference', { validate: (v, all) => all.method === 'cash' || !!(v || '').trim() || `Enter the ${refLabel.toLowerCase()}` })} error={err('reference')} autoComplete="off" />
          </Field>
        )}
        <ErrorNote>{serverError}</ErrorNote>
      </form>
    </Modal>
  )
}
