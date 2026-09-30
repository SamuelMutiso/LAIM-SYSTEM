import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { Banknote, Building2, Download, HandCoins, Landmark, Plus, Smartphone, Target } from 'lucide-react'
import { Members, Pledges as PledgesApi } from '../api/services'
import { errorField, errorMessage } from '../api/client'
import { useApi, useMutation } from '../app/hooks'
import { selectBranchParam, selectCanWrite } from '../app/store'
import { Avatar, BranchTag, Button, Card, Chips, Empty, ErrorNote, Field, Input, Loading, MemberPicker, Modal, PageHeader, PledgeStatus, ReadOnlyNote, SearchBox, Tabs, Textarea } from '../components/ui'
import { PAYMENT_METHODS, PLEDGE_PROJECTS } from '../lib/constants'
import { compactMoney, cx, downloadCSV, fmtDate, money, today } from '../lib/utils'

const METHOD_ICON = { mpesa: Smartphone, bank: Landmark, cash: Banknote }

export default function Pledges() {
  const user = useSelector((s) => s.auth.user)
  const canWrite = useSelector(selectCanWrite)
  const branch_id = useSelector(selectBranchParam)
  const [tab, setTab] = useState('pledges')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [gifting, setGifting] = useState(false)
  const { data: fund } = useApi(() => PledgesApi.fund({ branch_id }), [branch_id])
  const { data: pledges, loading } = useApi(() => PledgesApi.list({ branch_id }), [branch_id])

  const counts = useMemo(() => (pledges || []).reduce((t, p) => ((t[p.status] = (t[p.status] || 0) + 1), t), {}), [pledges])
  const rows = (pledges || []).filter((p) => (!status || p.status === status) && (!q || p.member_name.toLowerCase().includes(q.toLowerCase())))
  const open = (pledges || []).find((p) => p.id === openId)
  const pct = fund ? Math.min(100, (fund.raised_total / fund.target) * 100) : 0

  const exportCsv = () =>
    downloadCSV('LAIM-pledges.csv', rows, [
      { label: 'Member', key: 'member_name' },
      { label: 'Project', key: 'project' },
      { label: 'Pledged', key: 'amount' },
      { label: 'Paid', key: 'paid' },
      { label: 'Balance', key: 'balance' },
      { label: 'Pledged on', key: 'pledged_on' },
      { label: 'Due', key: 'due_date' },
      { label: 'Status', key: 'status' },
    ])

  return (
    <div>
      <PageHeader
        eyebrow="Giving"
        title="Pledges & Building Fund"
        subtitle="Every pledge toward the main church building — what was promised, what has been paid, and what is still due."
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv}>
              Export
            </Button>
            {canWrite && (
              <>
                <Button variant="secondary" icon={HandCoins} onClick={() => setGifting(true)}>
                  Building fund gift
                </Button>
                <Button icon={Plus} onClick={() => setAdding(true)}>
                  New pledge
                </Button>
              </>
            )}
          </>
        }
      />
      {!canWrite && (
        <div className="mb-4">
          <ReadOnlyNote role={user.role} />
        </div>
      )}

      {fund && (
        <Card className="relative mb-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-altar-900 via-altar-800 to-altar-700" />
          <div className="absolute inset-0 bg-flame-glow opacity-70" />
          <div className="relative grid gap-6 p-6 text-white lg:grid-cols-[1.3fr_1fr] lg:p-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-flame-300">
                <Building2 className="h-4 w-4" /> {fund.project}
              </div>
              <div className="mt-3 font-display text-4xl font-bold">{money(fund.raised_total)}</div>
              <div className="mt-1 text-sm text-altar-100">
                raised of {money(fund.target)} target{fund.target_is_sample && ' (sample target — set the real one)'}
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-gradient-to-r from-flame-300 to-flame-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 text-xs font-semibold text-flame-200">{pct.toFixed(1)}% complete</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Pledged', fund.pledged_total],
                ['Paid on pledges', fund.pledge_paid_total],
                ['Still owed on pledges', fund.outstanding_total],
                ['Direct gifts', fund.direct_total],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-altar-100">{k}</div>
                  <div className="num mt-1 text-lg font-semibold">{compactMoney(v)}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'pledges', label: 'Pledges', icon: Target },
          { key: 'gifts', label: 'Building fund gifts', icon: HandCoins },
        ]}
      />

      {tab === 'pledges' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Chips
              value={status}
              onChange={setStatus}
              options={[
                { key: '', label: 'All', count: pledges?.length ?? 0 },
                { key: 'Fully Paid', label: 'Fully paid', count: counts['Fully Paid'] || 0 },
                { key: 'Partly Paid', label: 'Partly paid', count: counts['Partly Paid'] || 0 },
                { key: 'Not Started', label: 'Not started', count: counts['Not Started'] || 0 },
                { key: 'Overdue', label: 'Overdue', count: counts['Overdue'] || 0 },
              ]}
            />
            <SearchBox value={q} onChange={setQ} placeholder="Find member…" className="lg:w-64" />
          </div>
          <Card>
            {loading ? (
              <Loading />
            ) : rows.length === 0 ? (
              <Empty icon={Target} title="No pledges here" />
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[860px]">
                  <thead className="bg-linen/60">
                    <tr>
                      <th className="th">Member</th>
                      {user.role === 'bishop' && <th className="th">Branch</th>}
                      <th className="th text-right">Pledged</th>
                      <th className="th text-right">Paid</th>
                      <th className="th text-right">Balance</th>
                      <th className="th">Progress</th>
                      <th className="th">Pay by</th>
                      <th className="th">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id} onClick={() => setOpenId(p.id)} className="cursor-pointer border-t border-ink-100 hover:bg-altar-50/40">
                        <td className="td">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={p.member_name} size={30} />
                            <span className="font-semibold text-ink-900">{p.member_name}</span>
                          </div>
                        </td>
                        {user.role === 'bishop' && (
                          <td className="td">
                            <BranchTag id={p.branch_id} />
                          </td>
                        )}
                        <td className="td num text-right">{money(p.amount)}</td>
                        <td className="td num text-right">{money(p.paid)}</td>
                        <td className={cx('td num text-right font-semibold', p.balance ? 'text-ink-900' : 'text-emerald-700')}>{money(p.balance)}</td>
                        <td className="td w-32">
                          <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                            <div className={cx('h-full rounded-full', p.status === 'Overdue' ? 'bg-scripture-500' : 'bg-flame-500')} style={{ width: `${(p.paid / p.amount) * 100}%` }} />
                          </div>
                        </td>
                        <td className="td whitespace-nowrap">{fmtDate(p.due_date)}</td>
                        <td className="td">
                          <PledgeStatus status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink-200 bg-linen/60 font-semibold">
                      <td className="td" colSpan={user.role === 'bishop' ? 2 : 1}>
                        {rows.length} pledges
                      </td>
                      <td className="td num text-right">{money(rows.reduce((s, p) => s + p.amount, 0))}</td>
                      <td className="td num text-right">{money(rows.reduce((s, p) => s + p.paid, 0))}</td>
                      <td className="td num text-right">{money(rows.reduce((s, p) => s + p.balance, 0))}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card>
          {!fund ? (
            <Loading />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[680px]">
                <thead className="bg-linen/60">
                  <tr>
                    <th className="th">Date</th>
                    <th className="th">From</th>
                    {user.role === 'bishop' && <th className="th">Branch</th>}
                    <th className="th">Method</th>
                    <th className="th text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {fund.contributions.map((c) => {
                    const I = METHOD_ICON[c.method]
                    return (
                      <tr key={c.id} className="border-t border-ink-100">
                        <td className="td whitespace-nowrap">{fmtDate(c.date)}</td>
                        <td className="td font-semibold text-ink-900">{c.contributor}</td>
                        {user.role === 'bishop' && (
                          <td className="td">
                            <BranchTag id={c.branch_id} />
                          </td>
                        )}
                        <td className="td">
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <I className="h-3.5 w-3.5 text-ink-400" />
                            <span className="num">{c.reference || 'Cash'}</span>
                          </span>
                        </td>
                        <td className="td num text-right font-semibold">{money(c.amount)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <PledgeDetail pledge={open} onClose={() => setOpenId(null)} canWrite={canWrite} />
      <NewPledge open={adding} onClose={() => setAdding(false)} />
      <FundGift open={gifting} onClose={() => setGifting(false)} />
    </div>
  )
}

function PaymentFields({ register, watch, setValue, clearErrors, err }) {
  const method = watch('method')
  const refLabel = PAYMENT_METHODS.find((m) => m.key === method)?.refLabel
  return (
    <>
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
                className={cx('flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition', method === m.key ? 'border-altar-600 bg-altar-50 text-altar-700 ring-2 ring-altar-100' : 'border-ink-200 text-ink-600')}
              >
                <I className="h-4 w-4" /> {m.label}
              </button>
            )
          })}
        </div>
      </Field>
      {refLabel && (
        <Field label={refLabel} error={err('reference')}>
          <Input className="num uppercase" autoComplete="off" {...register('reference', { validate: (v, all) => all.method === 'cash' || !!(v || '').trim() || `Enter the ${refLabel.toLowerCase()}` })} error={err('reference')} />
        </Field>
      )}
    </>
  )
}

function useServerForm(defaults, mutate, successMsg, onDone) {
  const form = useForm({ defaultValues: defaults })
  const [serverError, setServerError] = useState(null)
  const [save, busy] = useMutation(mutate, { success: successMsg })
  const submit = form.handleSubmit(async (body) => {
    setServerError(null)
    const { error } = await save(body)
    if (error) {
      const f = errorField(error)
      if (f) form.setError(f, { message: errorMessage(error) })
      else setServerError(errorMessage(error))
      return
    }
    form.reset(defaults)
    onDone()
  })
  const err = (k) => form.formState.errors[k]?.message
  return { ...form, submit, busy, serverError, err }
}

function PledgeDetail({ pledge, onClose, canWrite }) {
  const f = useServerForm(
    { date: format(today(), 'yyyy-MM-dd'), amount: '', method: 'mpesa', reference: '' },
    (body) => PledgesApi.pay(pledge.id, body),
    (p) => `Payment recorded — balance ${money(p.balance)}`,
    () => {},
  )
  if (!pledge) return <Modal open={false} onClose={onClose} />
  return (
    <Modal open={!!pledge} onClose={onClose} title={pledge.member_name} subtitle={`${pledge.project} · pledged ${fmtDate(pledge.pledged_on)}`} width="max-w-xl">
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Pledged', pledge.amount, 'text-ink-900'],
          ['Paid', pledge.paid, 'text-emerald-700'],
          ['Balance', pledge.balance, pledge.balance ? 'text-scripture-700' : 'text-emerald-700'],
        ].map(([k, v, c]) => (
          <div key={k} className="rounded-2xl bg-linen p-3">
            <div className="text-[11px] font-semibold uppercase text-ink-500">{k}</div>
            <div className={cx('num mt-1 font-semibold', c)}>{money(v)}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-ink-500">To be paid by {fmtDate(pledge.due_date)}</span>
        <PledgeStatus status={pledge.status} />
      </div>
      <h4 className="mb-2 mt-5 text-sm font-semibold">Payments</h4>
      <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
        {pledge.payments.length === 0 && <div className="p-4 text-sm text-ink-500">No payments yet.</div>}
        {pledge.payments.map((p) => {
          const I = METHOD_ICON[p.method]
          return (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <I className="h-4 w-4 text-ink-400" />
              <span className="flex-1">{fmtDate(p.date)}</span>
              <span className="num text-xs text-ink-500">{p.reference || 'Cash'}</span>
              <span className="num w-24 text-right font-semibold">{money(p.amount)}</span>
            </div>
          )
        })}
      </div>
      {canWrite && pledge.balance > 0 && (
        <form onSubmit={f.submit} className="mt-5 space-y-4 rounded-2xl border border-altar-100 bg-altar-50/50 p-4">
          <div className="text-sm font-semibold text-altar-800">Record a payment</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (KSh)" error={f.err('amount')}>
              <Input type="number" min="1" className="num" placeholder={String(pledge.balance)} {...f.register('amount', { required: 'Enter amount' })} error={f.err('amount')} />
            </Field>
            <Field label="Date">
              <Input type="date" {...f.register('date')} />
            </Field>
          </div>
          <PaymentFields {...f} />
          <ErrorNote>{f.serverError}</ErrorNote>
          <Button type="submit" loading={f.busy} className="w-full">
            Save payment
          </Button>
        </form>
      )}
    </Modal>
  )
}

function NewPledge({ open, onClose }) {
  const { data: members } = useApi(() => (open ? Members.list({ status: 'Active' }) : Promise.resolve([])), [open])
  const f = useServerForm(
    { member_id: '', project: PLEDGE_PROJECTS[0], amount: '', pledged_on: format(today(), 'yyyy-MM-dd'), due_date: '', notes: '' },
    PledgesApi.create,
    (p) => `Pledge of ${money(p.amount)} recorded for ${p.member_name}`,
    onClose,
  )
  f.register('member_id', { required: 'Pick the member' })
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New pledge"
      subtitle="Members from any branch can pledge toward the main church."
      width="max-w-xl"
      footer={
        <Button onClick={f.submit} loading={f.busy}>
          Save pledge
        </Button>
      }
    >
      <form onSubmit={f.submit} className="space-y-4">
        <Field label="Member" error={f.err('member_id')}>
          <MemberPicker
            members={members || []}
            value={f.watch('member_id')}
            error={f.err('member_id')}
            onChange={(id) => {
              f.setValue('member_id', id)
              f.clearErrors('member_id')
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount pledged (KSh)" error={f.err('amount')}>
            <Input type="number" min="1" className="num" {...f.register('amount', { required: 'Enter amount' })} error={f.err('amount')} />
          </Field>
          <Field label="Project">
            <Input {...f.register('project')} />
          </Field>
          <Field label="Pledged on">
            <Input type="date" {...f.register('pledged_on')} />
          </Field>
          <Field label="To be paid by" error={f.err('due_date')}>
            <Input type="date" {...f.register('due_date', { required: 'Set a date' })} error={f.err('due_date')} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea {...f.register('notes')} />
        </Field>
        <ErrorNote>{f.serverError}</ErrorNote>
      </form>
    </Modal>
  )
}

function FundGift({ open, onClose }) {
  const { data: members } = useApi(() => (open ? Members.list({ status: 'Active' }) : Promise.resolve([])), [open])
  const f = useServerForm(
    { member_id: '', contributor: '', amount: '', date: format(today(), 'yyyy-MM-dd'), method: 'mpesa', reference: '' },
    PledgesApi.contribute,
    (c) => `${money(c.amount)} from ${c.contributor} recorded`,
    onClose,
  )
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Building fund gift"
      subtitle="A direct contribution that isn’t part of a pledge — harambee, well-wishers, fellowships."
      width="max-w-xl"
      footer={
        <Button onClick={f.submit} loading={f.busy}>
          Save gift
        </Button>
      }
    >
      <form onSubmit={f.submit} className="space-y-4">
        <Field label="Member (optional)">
          <MemberPicker members={members || []} value={f.watch('member_id')} onChange={(id) => f.setValue('member_id', id)} />
        </Field>
        <Field label="Or name of giver / group" hint="e.g. Women’s Fellowship, Well-wisher">
          <Input {...f.register('contributor')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (KSh)" error={f.err('amount')}>
            <Input type="number" min="1" className="num" {...f.register('amount', { required: 'Enter amount' })} error={f.err('amount')} />
          </Field>
          <Field label="Date">
            <Input type="date" {...f.register('date')} />
          </Field>
        </div>
        <PaymentFields {...f} />
        <ErrorNote>{f.serverError}</ErrorNote>
      </form>
    </Modal>
  )
}
