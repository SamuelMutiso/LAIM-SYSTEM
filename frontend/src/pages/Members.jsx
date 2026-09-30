import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Baby, Download, Droplets, Flame, HeartHandshake, Mail, MapPin, Pencil, Phone, Plus, Sparkles, UserPlus, Users } from 'lucide-react'
import { HomeChurch, Members as MembersApi } from '../api/services'
import { errorField, errorMessage } from '../api/client'
import { useApi, useMutation } from '../app/hooks'
import { selectBranchParam, selectCanWrite } from '../app/store'
import { Avatar, Badge, BranchTag, PledgeStatus, Button, Card, Chips, Drawer, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, ReadOnlyNote, SearchBox, Select, Textarea } from '../components/ui'
import { GROUPS, MARITAL, groupLabel } from '../lib/constants'
import { ageOf, downloadCSV, fmtDate, groupFor, money, cx } from '../lib/utils'

const GROUP_TONE = { sunday_school: 'flame', teens: 'scripture', junior_youth: 'altar', senior_youth: 'altar', fathers: 'ink', mothers: 'ink' }

export default function Members() {
  const user = useSelector((s) => s.auth.user)
  const canWrite = useSelector(selectCanWrite)
  const branch_id = useSelector(selectBranchParam)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [gender, setGender] = useState('')
  const [status, setStatus] = useState('Active')
  const [cell, setCell] = useState('')
  const [openId, setOpenId] = useState(null)
  const [editing, setEditing] = useState(null)
  const group = params.get('group') || ''
  const awaitingBaptism = params.get('awaiting') === 'baptism'

  const { data: all, loading } = useApi(() => MembersApi.list({ branch_id }), [branch_id])
  const { data: cells } = useApi(() => HomeChurch.cells(), [])

  const base = useMemo(() => {
    let rows = all || []
    if (status) rows = rows.filter((m) => m.membership_status === status)
    if (gender) rows = rows.filter((m) => m.gender === gender)
    if (cell) rows = rows.filter((m) => m.home_church_id === Number(cell))
    if (awaitingBaptism) rows = rows.filter((m) => m.salvation_date && !m.water_baptism_date && m.group !== 'sunday_school')
    if (q) {
      const s = q.toLowerCase()
      rows = rows.filter((m) => m.full_name.toLowerCase().includes(s) || (m.phone || '').includes(s) || (m.email || '').toLowerCase().includes(s) || (m.residence || '').toLowerCase().includes(s))
    }
    return rows
  }, [all, status, gender, cell, q, awaitingBaptism])
  const rows = group ? base.filter((m) => m.group === group) : base
  const counts = useMemo(() => base.reduce((t, m) => ((t[m.group] = (t[m.group] || 0) + 1), t), {}), [base])

  const setGroup = (g) => {
    const p = new URLSearchParams(params)
    if (g) p.set('group', g)
    else p.delete('group')
    setParams(p, { replace: true })
  }

  const exportCsv = () =>
    downloadCSV(`LAIM-members-${group || 'all'}.csv`, rows, [
      { label: 'Full name', key: 'full_name' },
      { label: 'Gender', get: (m) => (m.gender === 'F' ? 'Female' : 'Male') },
      { label: 'Age', get: (m) => ageOf(m.dob) },
      { label: 'Group', get: (m) => groupLabel(m.group) },
      { label: 'Phone', key: 'phone' },
      { label: 'Email', key: 'email' },
      { label: 'Residence', key: 'residence' },
      { label: 'Marital status', key: 'marital_status' },
      { label: 'Home church', key: 'home_church' },
      { label: 'Status', key: 'membership_status' },
    ])

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Members"
        subtitle="Every member, grouped automatically by age and marital status. Click a name to open their full record."
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv}>
              Export
            </Button>
            {canWrite && (
              <Button icon={UserPlus} onClick={() => setEditing({})}>
                Add member
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

      <div className="mb-4">
        <Chips value={group} onChange={setGroup} options={[{ key: '', label: 'Everyone', count: base.length }, ...GROUPS.map((g) => ({ key: g.key, label: g.label, count: counts[g.key] || 0 }))]} />
      </div>

      <Card>
        <div className="grid gap-3 border-b border-ink-100 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_150px_150px_180px]">
          <SearchBox value={q} onChange={setQ} placeholder="Search name, phone, email or area…" />
          <Select value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Gender">
            <option value="">All genders</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Any status</option>
            {['Active', 'Inactive', 'Transferred', 'Deceased'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select value={cell} onChange={(e) => setCell(e.target.value)} aria-label="Home church">
            <option value="">All home churches</option>
            {(cells || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        {awaitingBaptism && (
          <div className="flex items-center justify-between border-b border-ink-100 bg-sky-50 px-4 py-2 text-sm text-sky-800">
            <span className="flex items-center gap-2">
              <Droplets className="h-4 w-4" /> Showing members who are saved but not yet water-baptised
            </span>
            <button className="text-xs font-semibold underline" onClick={() => setParams({}, { replace: true })}>
              Clear
            </button>
          </div>
        )}
        {loading ? (
          <Loading rows={8} />
        ) : rows.length === 0 ? (
          <Empty icon={Users} title="No members match" body="Try clearing a filter or searching a different name." />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full md:min-w-[820px]">
              <thead className="bg-linen/60">
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Group</th>
                  <th className="th hidden sm:table-cell">Phone</th>
                  <th className="th hidden md:table-cell">Residence</th>
                  <th className="th hidden md:table-cell">Home church</th>
                  {user.role === 'bishop' && <th className="th hidden lg:table-cell">Branch</th>}
                  <th className="th hidden text-right sm:table-cell">Age</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 300).map((m) => (
                  <tr key={m.id} onClick={() => setOpenId(m.id)} className="cursor-pointer border-t border-ink-100 transition hover:bg-altar-50/40">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.full_name} size={34} />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink-900">
                            {m.title ? `${m.title} ` : ''}
                            {m.full_name}
                          </div>
                          <div className="truncate text-xs text-ink-500">{m.email || (m.gender === 'F' ? 'Female' : 'Male')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <Badge tone={GROUP_TONE[m.group]}>{groupLabel(m.group)}</Badge>
                    </td>
                    <td className="td num hidden text-[13px] sm:table-cell">{m.phone || '—'}</td>
                    <td className="td hidden md:table-cell">{m.residence}</td>
                    <td className="td hidden md:table-cell">{m.home_church}</td>
                    {user.role === 'bishop' && (
                      <td className="td hidden lg:table-cell">
                        <BranchTag id={m.branch_id} />
                      </td>
                    )}
                    <td className="td num hidden text-right sm:table-cell">{ageOf(m.dob)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-ink-100 px-4 py-3 text-xs text-ink-500">
              {rows.length} member{rows.length === 1 ? '' : 's'}
              {rows.length > 300 && ' · showing first 300, refine your search'}
            </div>
          </div>
        )}
      </Card>

      <MemberDrawer id={openId} onClose={() => setOpenId(null)} canWrite={canWrite} onEdit={(m) => setEditing(m)} />
      <MemberForm member={editing} cells={(cells || []).filter((c) => !user.branch_id || user.role === 'bishop' || c.branch_id === user.branch_id)} onClose={() => setEditing(null)} />
    </div>
  )
}

function MemberDrawer({ id, onClose, canWrite, onEdit }) {
  const { data: m, loading } = useApi(() => (id ? MembersApi.get(id) : Promise.resolve(null)), [id])
  return (
    <Drawer open={!!id} onClose={onClose}>
      {loading || !m ? (
        <Loading rows={8} />
      ) : (
        <div>
          <div className="relative overflow-hidden bg-altar-900 px-6 pb-6 pt-10 text-white">
            <div className="absolute inset-0 bg-flame-glow opacity-50" />
            <div className="relative flex items-end gap-4">
              <Avatar name={m.full_name} size={64} tone={1} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-flame-300">{groupLabel(m.group)}</div>
                <h2 className="truncate text-2xl font-bold">
                  {m.title ? `${m.title} ` : ''}
                  {m.full_name}
                </h2>
                <div className="mt-1 text-sm text-altar-100">
                  {ageOf(m.dob)} years · {m.gender === 'F' ? 'Female' : 'Male'} · {m.marital_status}
                  {m.single_parent ? ' · Single parent' : ''}
                </div>
              </div>
            </div>
            {canWrite && (
              <Button size="sm" variant="gold" icon={Pencil} className="relative mt-5" onClick={() => onEdit(m)}>
                Edit details
              </Button>
            )}
          </div>

          <div className="space-y-5 p-6">
            <Card className="divide-y divide-ink-100">
              {[
                [Phone, 'Phone', m.phone ? <a href={`tel:${m.phone}`} className="num text-altar-700 hover:underline">{m.phone}</a> : '—'],
                [Mail, 'Email', m.email ? <a href={`mailto:${m.email}`} className="text-altar-700 hover:underline">{m.email}</a> : '—'],
                [MapPin, 'Lives at', m.residence || '—'],
              ].map(([I, k, v]) => (
                <div key={k} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <I className="h-4 w-4 text-ink-400" />
                  <span className="w-20 text-ink-500">{k}</span>
                  <span className="flex-1 font-medium">{v}</span>
                </div>
              ))}
            </Card>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Branch', <BranchTag key="b" id={m.branch_id} short={false} />],
                ['Home church', m.home_church],
                ['Member since', fmtDate(m.joined_on, 'MMM yyyy')],
                ['Status', <Badge key="s" tone={m.membership_status === 'Active' ? 'green' : 'ink'}>{m.membership_status}</Badge>],
                ['Date of birth', fmtDate(m.dob)],
                ['Occupation', m.occupation || '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white p-3 shadow-card">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{k}</div>
                  <div className="mt-0.5 font-medium text-ink-900">{v}</div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-ink-900">Spiritual milestones</h3>
              <div className="grid grid-cols-2 gap-3">
                <Milestone icon={Sparkles} label="Born again" value={m.salvation_date ? fmtDate(m.salvation_date) : null} />
                <Milestone icon={Droplets} label="Water baptism" value={m.water_baptism_date ? fmtDate(m.water_baptism_date) : null} />
                <Milestone icon={Flame} label="Holy Spirit baptism" value={m.holy_spirit_baptism ? 'Yes' : null} />
                <Milestone icon={Baby} label="Child dedication" value={m.dedication_date ? fmtDate(m.dedication_date) : null} />
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-ink-900">Tithe history</h3>
                <span className="num text-sm font-semibold text-altar-700">{money(m.tithe_total)} total</span>
              </div>
              <Card className="divide-y divide-ink-100">
                {m.tithes.length === 0 && <div className="p-4 text-sm text-ink-500">No tithe recorded.</div>}
                {m.tithes.slice(0, 8).map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span>{fmtDate(t.date)}</span>
                    <span className="text-xs text-ink-500">{t.method === 'mpesa' ? `M-Pesa ${t.reference}` : t.method === 'bank' ? `Bank ${t.reference}` : 'Cash'}</span>
                    <span className="num font-semibold">{money(t.amount)}</span>
                  </div>
                ))}
              </Card>
            </div>

            {m.pledges.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-ink-900">Pledges</h3>
                {m.pledges.map((p) => (
                  <Card key={p.id} className="p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{p.project}</span>
                      <PledgeStatus status={p.status} />
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-flame-500" style={{ width: `${(p.paid / p.amount) * 100}%` }} />
                    </div>
                    <div className="num mt-2 flex justify-between text-xs text-ink-500">
                      <span>Paid {money(p.paid)} of {money(p.amount)}</span>
                      <span>Balance {money(p.balance)} · due {fmtDate(p.due_date)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}

function Milestone({ icon: Icon, label, value }) {
  return (
    <div className={cx('flex items-center gap-3 rounded-xl border p-3', value ? 'border-flame-200 bg-flame-50/60' : 'border-dashed border-ink-200 bg-white')}>
      <Icon className={cx('h-5 w-5', value ? 'text-flame-600' : 'text-ink-300')} />
      <div>
        <div className="text-xs font-semibold text-ink-700">{label}</div>
        <div className={cx('text-xs', value ? 'text-ink-900' : 'text-ink-400')}>{value || 'Not yet'}</div>
      </div>
    </div>
  )
}

function MemberForm({ member, cells, onClose }) {
  const isNew = member && !member.id
  const { register, handleSubmit, watch, reset, setError, formState } = useForm({ values: member ? { ...emptyMember, ...member } : emptyMember })
  const [serverError, setServerError] = useState(null)
  const [save, busy] = useMutation((body) => (isNew ? MembersApi.create(body) : MembersApi.update(member.id, body)), {
    success: (m) => (isNew ? `${m.full_name} added` : 'Member updated'),
  })
  const v = watch()
  const previewGroup = v.dob ? groupFor(v) : null

  const onSubmit = async (body) => {
    setServerError(null)
    const { error } = await save(body)
    if (error) {
      const f = errorField(error)
      if (f) setError(f, { message: errorMessage(error) })
      else setServerError(errorMessage(error))
      return
    }
    reset(emptyMember)
    onClose()
  }
  const err = (k) => formState.errors[k]?.message

  return (
    <Modal
      open={!!member}
      onClose={onClose}
      title={isNew ? 'Add a member' : `Edit ${member?.full_name}`}
      subtitle="Group is worked out from date of birth, gender and marital status."
      width="max-w-3xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={busy} icon={isNew ? Plus : undefined}>
            {isNew ? 'Save member' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <Section title="Personal details">
          <Field label="First name" error={err('first_name')}>
            <Input {...register('first_name', { required: 'Required' })} error={err('first_name')} />
          </Field>
          <Field label="Last name" error={err('last_name')}>
            <Input {...register('last_name', { required: 'Required' })} error={err('last_name')} />
          </Field>
          <Field label="Gender">
            <Select {...register('gender')}>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </Select>
          </Field>
          <Field label="Date of birth" error={err('dob')}>
            <Input type="date" {...register('dob', { required: 'Required' })} error={err('dob')} />
          </Field>
          <Field label="Marital status">
            <Select {...register('marital_status')}>
              {MARITAL.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-3 self-end rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-altar-600" {...register('single_parent')} />
            <span>
              <span className="font-semibold">Single parent</span>
              <span className="block text-xs text-ink-500">Counts with Fathers / Mothers</span>
            </span>
          </label>
        </Section>
        {previewGroup && (
          <div className="flex items-center gap-2 rounded-xl bg-altar-50 px-4 py-2.5 text-sm text-altar-800">
            <HeartHandshake className="h-4 w-4" /> Will be listed under <b>{groupLabel(previewGroup)}</b>
          </div>
        )}
        <Section title="Contact">
          <Field label="Phone" error={err('phone')} hint="e.g. 0712 345 678">
            <Input {...register('phone')} error={err('phone')} inputMode="tel" />
          </Field>
          <Field label="Email">
            <Input type="email" {...register('email')} />
          </Field>
          <Field label="Where they stay" className="sm:col-span-2">
            <Input {...register('residence')} placeholder="Estate / area" />
          </Field>
          <Field label="Occupation">
            <Input {...register('occupation')} />
          </Field>
        </Section>
        <Section title="Church">
          <Field label="Home church">
            <Select {...register('home_church_id')}>
              <option value="">— None yet —</option>
              {cells.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.area}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Membership status">
            <Select {...register('membership_status')}>
              {['Active', 'Inactive', 'Transferred', 'Deceased'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Member since">
            <Input type="date" {...register('joined_on')} />
          </Field>
        </Section>
        <Section title="Spiritual milestones">
          <Field label="Born again on">
            <Input type="date" {...register('salvation_date')} />
          </Field>
          <Field label="Water baptism on">
            <Input type="date" {...register('water_baptism_date')} />
          </Field>
          <Field label="Child dedication on" hint="For children">
            <Input type="date" {...register('dedication_date')} />
          </Field>
          <label className="flex items-center gap-3 self-end rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm font-semibold">
            <input type="checkbox" className="h-4 w-4 accent-altar-600" {...register('holy_spirit_baptism')} />
            Baptised in the Holy Spirit
          </label>
        </Section>
        <Field label="Notes">
          <Textarea {...register('notes')} />
        </Field>
        <ErrorNote>{serverError}</ErrorNote>
      </form>
    </Modal>
  )
}

const emptyMember = {
  first_name: '',
  last_name: '',
  gender: 'M',
  dob: '',
  marital_status: 'Single',
  single_parent: false,
  phone: '',
  email: '',
  residence: '',
  occupation: '',
  home_church_id: '',
  membership_status: 'Active',
  joined_on: '',
  salvation_date: '',
  water_baptism_date: '',
  dedication_date: '',
  holy_spirit_baptism: false,
  notes: '',
}

function Section({ title, children }) {
  return (
    <fieldset>
      <legend className="mb-3 font-display text-sm font-semibold text-ink-900">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}
