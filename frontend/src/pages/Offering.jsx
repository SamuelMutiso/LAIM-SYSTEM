import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { format, isSunday, previousSunday } from 'date-fns'
import { Banknote, ChevronDown, Coins, Download, ListOrdered, Plus, Smartphone, Trash2 } from 'lucide-react'
import { Offerings } from '../api/services'
import { errorField, errorMessage } from '../api/client'
import { useApi, useMutation } from '../app/hooks'
import { selectBranchParam, selectCanWrite } from '../app/store'
import { BranchTag, Button, Card, CardHeader, Chips, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, ReadOnlyNote, Select, Stat } from '../components/ui'
import { PeriodPicker } from '../components/PeriodPicker'
import { periodRange } from '../lib/period'
import { DENOMINATIONS, SERVICES, branchById } from '../lib/constants'
import { cx, downloadCSV, fmtDate, money, num, today } from '../lib/utils'

export default function Offering() {
  const user = useSelector((s) => s.auth.user)
  const canWrite = useSelector(selectCanWrite)
  const branch_id = useSelector(selectBranchParam)
  const [period, setPeriod] = useState('3m')
  const [custom, setCustom] = useState({ from: '2026-01-01', to: format(today(), 'yyyy-MM-dd') })
  const [recording, setRecording] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [service, setService] = useState('')
  const range = periodRange(period, custom)
  const { data: report } = useApi(() => Offerings.report({ branch_id, from: range.from, to: range.to }), [branch_id, range.from, range.to])
  const { data: allRows, loading } = useApi(() => Offerings.list({ branch_id, from: range.from, to: range.to }), [branch_id, range.from, range.to])
  const rows = useMemo(() => (allRows || []).filter((r) => !service || r.service === service), [allRows, service])
  const serviceOptions = [{ key: '', label: 'All services' }, ...(report?.by_service || []).map((s) => ({ key: s.service, label: s.service }))]

  const exportCsv = () =>
    downloadCSV(`LAIM-offering-${range.label}.csv`, rows || [], [
      { label: 'Date', key: 'date' },
      { label: 'Service', key: 'service' },
      { label: 'Branch', get: (r) => branchById(r.branch_id)?.name },
      ...DENOMINATIONS.map((d) => ({ label: `${d.value}s (count)`, get: (r) => r.counts[d.value] || 0 })),
      { label: 'Cash total', key: 'cash_total' },
      { label: 'M-Pesa', key: 'mpesa_total' },
      { label: 'Bank', key: 'bank_total' },
      { label: 'Total', key: 'total' },
    ])

  return (
    <div>
      <PageHeader
        eyebrow="Giving"
        title="Offering"
        subtitle="Every service — Sunday Main Service, Morning Glory, evening services and keshas."
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv}>
              Export
            </Button>
            {canWrite && (
              <Button icon={Plus} onClick={() => setRecording(true)}>
                Record offering
              </Button>
            )}
          </>
        }
      />
      {!canWrite && (
        <div className="mb-4">
          <ReadOnlyNote role={user.role} />
        </div>
      )}
      <div className="mb-5">
        <PeriodPicker value={period} onChange={setPeriod} custom={custom} onCustom={setCustom} />
      </div>

      {report && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label={`Total · ${range.label}`} value={money(report.total)} icon={Coins} tone="flame" sub={branch_id || user.role !== 'bishop' ? '' : 'All branches combined'} />
          <Stat label="Cash" value={money(report.cash)} icon={Banknote} tone="ink" />
          <Stat label="M-Pesa" value={money(report.mpesa)} icon={Smartphone} tone="ink" />
          <Stat label="Services recorded" value={num(report.services)} icon={ListOrdered} tone="altar" sub={`${report.sundays} Sunday${report.sundays === 1 ? '' : 's'}`} />
        </div>
      )}

      {report?.by_service?.length > 1 && (
        <Card className="mb-6">
          <CardHeader title="By service" subtitle={range.label} />
          <div className="grid overflow-hidden rounded-b-2xl border-t border-ink-100 sm:grid-cols-2 lg:grid-cols-3">
            {report.by_service.map((s) => (
              <button key={s.service} onClick={() => setService(service === s.service ? '' : s.service)} className={cx('flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5 text-left hover:bg-altar-50/40 sm:border-r', service === s.service && 'bg-altar-50')}>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink-900">{s.service}</span>
                  <span className="block text-xs text-ink-500">{s.count} recorded</span>
                </span>
                <span className="num shrink-0 font-semibold text-ink-900">{money(s.total)}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {serviceOptions.length > 2 && (
        <div className="mb-4">
          <Chips options={serviceOptions} value={service} onChange={setService} />
        </div>
      )}

      <Card>
        {loading ? (
          <Loading />
        ) : !rows?.length ? (
          <Empty icon={Coins} title="No offering recorded in this period" />
        ) : (
          <div className="divide-y divide-ink-100">
            {rows.map((o) => {
              const open = expanded === o.id
              return (
                <div key={o.id}>
                  <button onClick={() => setExpanded(open ? null : o.id)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-altar-50/30">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-flame-50 text-center leading-none">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-flame-700">{fmtDate(o.date, 'MMM')}</div>
                        <div className="font-display text-lg font-bold text-ink-900">{fmtDate(o.date, 'd')}</div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-ink-900">
                        {o.service} · {fmtDate(o.date, 'EEEE d MMMM')}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-500">
                        {user.role === 'bishop' && <BranchTag id={o.branch_id} />}
                        <span>Cash {money(o.cash_total)}</span>
                        <span>M-Pesa {money(o.mpesa_total)}</span>
                        {o.bank_total > 0 && <span>Bank {money(o.bank_total)}</span>}
                      </div>
                    </div>
                    <div className="num text-right text-lg font-semibold text-ink-900">{money(o.total)}</div>
                    <ChevronDown className={cx('h-4 w-4 text-ink-400 transition', open && 'rotate-180')} />
                  </button>
                  {open && (
                    <div className="bg-linen/60 px-5 py-4">
                      {Object.values(o.counts).some((n) => n > 0) ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
                        {DENOMINATIONS.map((d) => (
                          <div key={d.value} className="rounded-xl bg-white p-2.5 text-center shadow-card">
                            <div className="text-[10px] font-bold uppercase text-ink-400">{d.kind === 'note' ? 'Note' : 'Coin'}</div>
                            <div className="num font-semibold text-ink-900">{num(d.value)}</div>
                            <div className="num mt-1 text-xs text-ink-500">× {o.counts[d.value] || 0}</div>
                            <div className="num text-xs font-semibold text-altar-700">{num(d.value * (o.counts[d.value] || 0))}</div>
                          </div>
                        ))}
                      </div>
                      ) : (
                        <div className="text-sm text-ink-600">Cash recorded as a total: {money(o.cash_total)}</div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {o.counted_by && <div className="text-xs text-ink-500">Counted by: {o.counted_by}</div>}
                        {canWrite && <DeleteOffering offering={o} />}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
      <RecordOffering open={recording} onClose={() => setRecording(false)} />
    </div>
  )
}

function DeleteOffering({ offering }) {
  const [sure, setSure] = useState(false)
  const [remove, busy] = useMutation(() => Offerings.remove(offering.id), { success: 'Offering deleted' })
  if (!sure)
    return (
      <button onClick={() => setSure(true)} className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline">
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    )
  return (
    <div className="ml-auto flex items-center gap-2 text-xs">
      <span className="text-ink-600">Delete this entry?</span>
      <Button size="sm" variant="secondary" onClick={() => setSure(false)}>
        Keep
      </Button>
      <Button size="sm" variant="danger" loading={busy} onClick={() => remove()}>
        Delete
      </Button>
    </div>
  )
}

function RecordOffering({ open, onClose }) {
  const t = today()
  const lastSunday = isSunday(t) ? t : previousSunday(t)
  const defaults = { service: 'Main Service', service_other: '', date: format(lastSunday, 'yyyy-MM-dd'), counts: Object.fromEntries(DENOMINATIONS.map((d) => [`d${d.value}`, ''])), cash_only_total: '', mpesa_total: '', bank_total: '', counted_by: '', notes: '' }
  const { register, handleSubmit, watch, reset, setError, setValue, formState } = useForm({ defaultValues: defaults })
  const [mode, setMode] = useState('notes')
  const [serverError, setServerError] = useState(null)
  const [save, busy] = useMutation(Offerings.create, { success: (o) => `${o.service} offering of ${money(o.total)} recorded` })
  const v = watch()
  const counted = DENOMINATIONS.reduce((s, d) => s + d.value * (Number(v.counts?.[`d${d.value}`]) || 0), 0)
  const cash = mode === 'notes' ? counted : Number(v.cash_only_total) || 0
  const total = cash + (Number(v.mpesa_total) || 0) + (Number(v.bank_total) || 0)
  const err = (k) => formState.errors[k]?.message
  const serviceField = register('service')

  const close = () => {
    reset(defaults)
    setMode('notes')
    setServerError(null)
    onClose()
  }

  const onSubmit = async (body) => {
    setServerError(null)
    const counts = mode === 'notes' ? Object.fromEntries(Object.entries(body.counts).map(([k, n]) => [k.slice(1), Number(n) || 0])) : {}
    const { error } = await save({ ...body, counts, cash_only_total: mode === 'total' ? body.cash_only_total : '' })
    if (error) {
      const f = errorField(error)
      if (f) setError(f, { message: errorMessage(error) })
      else setServerError(errorMessage(error))
      return
    }
    close()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Record offering"
      subtitle="Choose the service, then enter what was collected. Totals add up automatically."
      width="max-w-2xl"
      footer={
        <>
          <div className="mr-auto self-center">
            <div className="text-[11px] font-semibold uppercase text-ink-500">Grand total</div>
            <div className="num text-xl font-bold text-altar-700">{money(total)}</div>
          </div>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={busy}>
            Save offering
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service" error={err('service')}>
            <Select
              {...serviceField}
              onChange={(e) => {
                serviceField.onChange(e)
                setValue('date', format(e.target.value === 'Main Service' ? lastSunday : t, 'yyyy-MM-dd'))
              }}
            >
              {SERVICES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date" error={err('date')}>
            <Input type="date" {...register('date', { required: 'Required' })} error={err('date')} />
          </Field>
          {v.service === 'Other' && (
            <Field label="Name of the service" error={err('service_other')} className="sm:col-span-2">
              <Input placeholder="e.g. Crusade, Fundraiser, Easter service" {...register('service_other')} error={err('service_other')} />
            </Field>
          )}
        </div>
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="label mb-0">Cash</div>
            <div className="inline-flex rounded-xl border border-ink-200 bg-white p-0.5">
              {[
                ['notes', 'Count notes & coins'],
                ['total', 'Total only'],
              ].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setMode(k)} className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold transition', mode === k ? 'bg-altar-600 text-white' : 'text-ink-500 hover:text-ink-900')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {mode === 'total' ? (
            <Field label="Cash collected (KSh)" hint="Use this for small collections that weren't counted note by note">
              <Input type="number" min="0" inputMode="numeric" className="num" {...register('cash_only_total')} />
            </Field>
          ) : (
          <div className="overflow-hidden rounded-2xl border border-ink-200">
            <div className="grid grid-cols-[1fr_1fr_1fr] bg-linen px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              <span>Denomination</span>
              <span className="text-center">How many</span>
              <span className="text-right">Amount</span>
            </div>
            {DENOMINATIONS.map((d) => {
              const c = Number(v.counts?.[`d${d.value}`]) || 0
              return (
                <div key={d.value} className="grid grid-cols-[1fr_1fr_1fr] items-center border-t border-ink-100 px-4 py-2">
                  <span className="flex items-center gap-2">
                    <span className={cx('grid h-7 place-items-center rounded-md px-2 text-[10px] font-bold', d.kind === 'note' ? 'bg-altar-50 text-altar-700' : 'rounded-full bg-flame-100 text-flame-800')}>{d.kind === 'note' ? 'NOTE' : 'COIN'}</span>
                    <span className="num font-semibold">KSh {num(d.value)}</span>
                  </span>
                  <Input type="number" min="0" step="1" inputMode="numeric" className="num mx-auto h-9 w-24 py-1 text-center" placeholder="0" {...register(`counts.d${d.value}`)} />
                  <span className={cx('num text-right text-sm', c ? 'font-semibold text-ink-900' : 'text-ink-300')}>{num(d.value * c)}</span>
                </div>
              )
            })}
            <div className="grid grid-cols-[2fr_1fr] border-t border-ink-200 bg-linen px-4 py-2.5 text-sm font-semibold">
              <span>Cash total</span>
              <span className="num text-right">{money(counted)}</span>
            </div>
          </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="M-Pesa offering (KSh)" hint="Total received on the church Paybill for this service">
            <Input type="number" min="0" className="num" {...register('mpesa_total')} />
          </Field>
          <Field label="Bank (KSh)">
            <Input type="number" min="0" className="num" {...register('bank_total')} />
          </Field>
          <Field label="Counted by" className="sm:col-span-2">
            <Input placeholder="Names of those who counted" {...register('counted_by')} />
          </Field>
        </div>
        <ErrorNote>{serverError}</ErrorNote>
      </form>
    </Modal>
  )
}
