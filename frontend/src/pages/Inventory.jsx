import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { AlertTriangle, Boxes, ClipboardCheck, Download, Pencil, Plus } from 'lucide-react'
import { Inventory as Api, Members } from '../api/services'
import { errorField, errorMessage } from '../api/client'
import { useApi, useMutation } from '../app/hooks'
import { selectBranchParam, selectCanWrite } from '../app/store'
import { Badge, BranchTag, Button, Card, Chips, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, ReadOnlyNote, SearchBox, Select, Textarea } from '../components/ui'
import { CONDITIONS, INVENTORY_CATEGORIES } from '../lib/constants'
import { cx, downloadCSV, fmtDate } from '../lib/utils'

const CONDITION_TONE = { Excellent: 'green', Good: 'altar', Fair: 'ink', 'Needs repair': 'flame', Missing: 'red' }

export default function Inventory() {
  const user = useSelector((s) => s.auth.user)
  const canWrite = useSelector(selectCanWrite)
  const branch_id = useSelector(selectBranchParam)
  const { data: items, loading } = useApi(() => Api.list({ branch_id }), [branch_id])
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)
  const [editing, setEditing] = useState(null)

  const byCat = useMemo(() => {
    const m = {}
    ;(items || []).forEach((i) => {
      m[i.category] ||= { items: 0, qty: 0 }
      m[i.category].items += 1
      m[i.category].qty += i.quantity
    })
    return m
  }, [items])
  const rows = (items || []).filter((i) => (!cat || i.category === cat) && (!q || `${i.name} ${i.brand} ${i.custodian} ${i.serial_no}`.toLowerCase().includes(q.toLowerCase())))
  const alerts = (items || []).filter((i) => ['Missing', 'Needs repair'].includes(i.condition))
  const open = (items || []).find((i) => i.id === openId)

  const exportCsv = () =>
    downloadCSV('LAIM-inventory.csv', rows, [
      { label: 'Item', key: 'name' },
      { label: 'Category', key: 'category' },
      { label: 'Brand', key: 'brand' },
      { label: 'Serial no.', key: 'serial_no' },
      { label: 'Quantity', key: 'quantity' },
      { label: 'Condition', key: 'condition' },
      { label: 'Location', key: 'location' },
      { label: 'In charge', key: 'custodian' },
      { label: 'Last checked', key: 'last_checked' },
    ])

  return (
    <div>
      <PageHeader
        eyebrow="Church"
        title="Inventory"
        subtitle="Every instrument and piece of equipment, how many we have, its condition, and who is responsible for it."
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv}>
              Export
            </Button>
            {canWrite && (
              <Button icon={Plus} onClick={() => setEditing({})}>
                Add item
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

      {alerts.length > 0 && (
        <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-scripture-200 bg-scripture-50 p-4 sm:flex-row sm:items-center">
          <AlertTriangle className="h-5 w-5 shrink-0 text-scripture-600" />
          <div className="flex-1 text-sm text-scripture-900">
            <b>{alerts.length} item{alerts.length > 1 ? 's' : ''} need attention:</b>{' '}
            {alerts.map((a, i) => (
              <span key={a.id}>
                <button onClick={() => setOpenId(a.id)} className="font-semibold underline decoration-dotted underline-offset-2">
                  {a.name} ({a.condition.toLowerCase()})
                </button>
                {i < alerts.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(byCat)
          .sort((a, b) => b[1].qty - a[1].qty)
          .slice(0, 10)
          .map(([k, v]) => (
            <button key={k} onClick={() => setCat(cat === k ? '' : k)} className={cx('card p-4 text-left transition hover:-translate-y-0.5', cat === k && 'ring-2 ring-altar-500')}>
              <div className="num font-display text-2xl font-bold">{v.qty}</div>
              <div className="mt-0.5 truncate text-xs font-semibold text-ink-700">{k}</div>
              <div className="text-[11px] text-ink-400">{v.items} kinds</div>
            </button>
          ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 lg:flex-row lg:items-center">
          <SearchBox value={q} onChange={setQ} placeholder="Search item, brand, serial or person…" className="lg:w-80" />
          <div className="min-w-0 flex-1">
            <Chips value={cat} onChange={setCat} options={[{ key: '', label: 'All' }, ...INVENTORY_CATEGORIES.filter((c) => byCat[c]).map((c) => ({ key: c, label: c }))]} />
          </div>
        </div>
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty icon={Boxes} title="Nothing here" />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[860px]">
              <thead className="bg-linen/60">
                <tr>
                  <th className="th">Item</th>
                  <th className="th">Category</th>
                  {user.role === 'bishop' && <th className="th">Branch</th>}
                  <th className="th text-right">Qty</th>
                  <th className="th">Condition</th>
                  <th className="th">Location</th>
                  <th className="th">In charge</th>
                  <th className="th">Last checked</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id} onClick={() => setOpenId(i.id)} className="cursor-pointer border-t border-ink-100 hover:bg-altar-50/40">
                    <td className="td">
                      <div className="font-semibold text-ink-900">{i.name}</div>
                      <div className="text-xs text-ink-500">
                        {i.brand}
                        {i.serial_no && <span className="num"> · {i.serial_no}</span>}
                      </div>
                    </td>
                    <td className="td">{i.category}</td>
                    {user.role === 'bishop' && (
                      <td className="td">
                        <BranchTag id={i.branch_id} />
                      </td>
                    )}
                    <td className="td num text-right text-base font-semibold text-ink-900">{i.quantity}</td>
                    <td className="td">
                      <Badge tone={CONDITION_TONE[i.condition]}>{i.condition}</Badge>
                    </td>
                    <td className="td">{i.location}</td>
                    <td className="td">{i.custodian}</td>
                    <td className="td whitespace-nowrap">{fmtDate(i.last_checked)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ItemDetail item={open} canWrite={canWrite} onClose={() => setOpenId(null)} onEdit={(it) => setEditing(it)} />
      <ItemForm item={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function ItemDetail({ item, canWrite, onClose, onEdit }) {
  const { data: history } = useApi(() => (item ? Api.history(item.id) : Promise.resolve([])), [item?.id, item?.last_checked])
  const { register, handleSubmit, reset, setError, formState } = useForm({ values: { counted: item?.quantity ?? '', condition: item?.condition === 'Missing' ? 'Good' : item?.condition ?? 'Good', note: '' } })
  const [serverError, setServerError] = useState(null)
  const [save, busy] = useMutation((body) => Api.stockTake(item.id, body), { success: 'Stock-take saved' })
  const onSubmit = async (body) => {
    setServerError(null)
    const { error } = await save(body)
    if (error) {
      const f = errorField(error)
      if (f) setError(f, { message: errorMessage(error) })
      else setServerError(errorMessage(error))
      return
    }
    reset()
  }
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={item?.name}
      subtitle={item ? `${item.category} · ${item.brand}` : ''}
      width="max-w-xl"
      footer={
        canWrite && (
          <Button variant="secondary" icon={Pencil} onClick={() => (onClose(), onEdit(item))}>
            Edit item
          </Button>
        )
      }
    >
      {item && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              ['Quantity', <span key="q" className="num text-lg font-semibold">{item.quantity}</span>],
              ['Condition', <Badge key="c" tone={CONDITION_TONE[item.condition]}>{item.condition}</Badge>],
              ['In charge', item.custodian || '—'],
              ['Location', item.location || '—'],
              ['Serial no.', <span key="s" className="num">{item.serial_no || '—'}</span>],
              ['Acquired', fmtDate(item.acquired_on, 'MMM yyyy')],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-linen p-3">
                <div className="text-[11px] font-semibold uppercase text-ink-500">{k}</div>
                <div className="mt-0.5 font-medium">{v}</div>
              </div>
            ))}
          </div>
          {item.notes && <div className="rounded-xl bg-scripture-50 px-3.5 py-2.5 text-sm text-scripture-800">{item.notes}</div>}
          <div>
            <h4 className="mb-2 text-sm font-semibold">Stock-take history</h4>
            <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
              {(history || []).map((h) => (
                <div key={h.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <ClipboardCheck className={cx('h-4 w-4', h.counted < h.expected ? 'text-scripture-500' : 'text-emerald-600')} />
                  <span className="w-28">{fmtDate(h.date)}</span>
                  <span className="num flex-1">
                    Counted {h.counted} of {h.expected}
                  </span>
                  <Badge tone={CONDITION_TONE[h.condition]}>{h.condition}</Badge>
                </div>
              ))}
            </div>
          </div>
          {canWrite && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-2xl border border-altar-100 bg-altar-50/50 p-4">
              <div className="text-sm font-semibold text-altar-800">Record a stock-take</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="How many did you find?" error={formState.errors.counted?.message}>
                  <Input type="number" min="0" className="num" {...register('counted', { required: 'Required' })} />
                </Field>
                <Field label="Condition" hint="Finding 0 marks it Missing">
                  <Select {...register('condition')}>
                    {CONDITIONS.filter((c) => c !== 'Missing').map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Note">
                <Input {...register('note')} placeholder="Anything to report?" />
              </Field>
              <ErrorNote>{serverError}</ErrorNote>
              <Button type="submit" loading={busy} className="w-full">
                Save stock-take
              </Button>
            </form>
          )}
        </div>
      )}
    </Modal>
  )
}

function ItemForm({ item, onClose }) {
  const isNew = item && !item.id
  const { data: members } = useApi(() => (item ? Members.list({ status: 'Active' }) : Promise.resolve([])), [!!item])
  const empty = { category: INVENTORY_CATEGORIES[0], name: '', brand: '', model: '', serial_no: '', quantity: 1, condition: 'Good', location: '', custodian_member_id: '', acquired_on: '', notes: '' }
  const { register, handleSubmit, reset, setError, formState } = useForm({ values: item ? { ...empty, ...item } : empty })
  const [serverError, setServerError] = useState(null)
  const [save, busy] = useMutation((body) => (isNew ? Api.create(body) : Api.update(item.id, body)), { success: isNew ? 'Item added' : 'Item updated' })
  const onSubmit = async (body) => {
    setServerError(null)
    const { error } = await save(body)
    if (error) {
      const f = errorField(error)
      if (f) setError(f, { message: errorMessage(error) })
      else setServerError(errorMessage(error))
      return
    }
    reset(empty)
    onClose()
  }
  const err = (k) => formState.errors[k]?.message
  return (
    <Modal open={!!item} onClose={onClose} title={isNew ? 'Add inventory item' : `Edit ${item?.name}`} width="max-w-2xl" footer={<Button onClick={handleSubmit(onSubmit)} loading={busy}>Save</Button>}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field label="Item name" error={err('name')} className="sm:col-span-2">
          <Input {...register('name', { required: 'Required' })} error={err('name')} placeholder="e.g. Yamaha Keyboard" />
        </Field>
        <Field label="Category">
          <Select {...register('category')}>
            {INVENTORY_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Quantity" error={err('quantity')}>
          <Input type="number" min="0" className="num" {...register('quantity', { required: 'Required' })} error={err('quantity')} />
        </Field>
        <Field label="Brand">
          <Input {...register('brand')} />
        </Field>
        <Field label="Serial number">
          <Input className="num" {...register('serial_no')} />
        </Field>
        <Field label="Condition">
          <Select {...register('condition')}>
            {CONDITIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Location">
          <Input {...register('location')} placeholder="e.g. Store room" />
        </Field>
        <Field label="Person in charge">
          <Select {...register('custodian_member_id')}>
            <option value="">— Choose —</option>
            {(members || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date acquired">
          <Input type="date" {...register('acquired_on')} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea {...register('notes')} />
        </Field>
        <div className="sm:col-span-2">
          <ErrorNote>{serverError}</ErrorNote>
        </div>
      </form>
    </Modal>
  )
}
