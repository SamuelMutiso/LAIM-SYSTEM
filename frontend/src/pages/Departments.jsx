import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { ArrowLeft, CalendarDays, Check, Copy, FilePlus2, KeyRound, Network, Pencil, Phone, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { Departments as Api, Members as MembersApi } from '../api/services'
import { errorField, errorMessage } from '../api/client'
import { useApi, useMutation } from '../app/hooks'
import { selectBranchParam } from '../app/store'
import { Avatar, Badge, BranchTag, Button, Card, CardHeader, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, ReadOnlyNote, Select, Textarea } from '../components/ui'
import { fmtDate, num, today } from '../lib/utils'

const SUGGESTED = ['Administration', 'Pastoral', 'Media', 'Development', 'Praise & Worship', 'Ushering', 'Sunday School', 'Youth', 'Intercession', 'Hospitality']

function useSubmit(save, onDone, setError, setServerError) {
  return async (body) => {
    setServerError(null)
    const { data, error } = await save(body)
    if (error) {
      const f = errorField(error)
      if (f) setError(f, { message: errorMessage(error) })
      else setServerError(errorMessage(error))
      return
    }
    onDone(data)
  }
}

export default function Departments() {
  const user = useSelector((s) => s.auth.user)
  const branch_id = useSelector(selectBranchParam)
  const isSecretary = user.role === 'secretary'
  const { data, loading } = useApi(() => Api.list(), [])
  const [editing, setEditing] = useState(null)
  const rows = (data || []).filter((d) => !branch_id || d.branch_id === Number(branch_id))
  const active = rows.filter((d) => d.active)
  const closed = rows.filter((d) => !d.active)
  const existing = new Set(rows.map((d) => d.name.toLowerCase()))

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Departments"
        subtitle="Every ministry team, its leader and what it has been doing."
        actions={
          isSecretary && (
            <Button icon={Plus} onClick={() => setEditing({})}>
              New department
            </Button>
          )
        }
      />
      {!isSecretary && (
        <div className="mb-4">
          <ReadOnlyNote role={user.role} />
        </div>
      )}

      {loading ? (
        <Card>
          <Loading />
        </Card>
      ) : !active.length ? (
        <Card>
          <Empty
            icon={Network}
            title="No departments yet"
            body={isSecretary ? 'Create a department, choose its leader from your members, then give the leader a login so they can file reports.' : 'The branch secretary sets up departments.'}
          />
          {isSecretary && (
            <div className="flex flex-wrap justify-center gap-2 px-5 pb-8">
              {SUGGESTED.map((n) => (
                <button key={n} onClick={() => setEditing({ name: n })} className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:border-altar-300 hover:bg-altar-50 hover:text-altar-700">
                  + {n}
                </button>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((d) => (
              <DepartmentCard key={d.id} d={d} showBranch={user.role === 'bishop'} />
            ))}
          </div>
          {isSecretary && SUGGESTED.some((n) => !existing.has(n.toLowerCase())) && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink-400">Quick add:</span>
              {SUGGESTED.filter((n) => !existing.has(n.toLowerCase())).map((n) => (
                <button key={n} onClick={() => setEditing({ name: n })} className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-600 hover:border-altar-300 hover:text-altar-700">
                  + {n}
                </button>
              ))}
            </div>
          )}
          {closed.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.16em] text-ink-400">Closed</h2>
              <div className="grid gap-4 opacity-70 sm:grid-cols-2 xl:grid-cols-3">
                {closed.map((d) => (
                  <DepartmentCard key={d.id} d={d} showBranch={user.role === 'bishop'} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <DepartmentForm dep={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function DepartmentCard({ d, showBranch }) {
  return (
    <Link to={`/departments/${d.id}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-semibold text-ink-900 group-hover:text-altar-700">{d.name}</h3>
          {d.description && <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{d.description}</p>}
        </div>
        {showBranch && <BranchTag id={d.branch_id} />}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-linen/70 p-3">
        {d.leader ? (
          <>
            <Avatar name={d.leader.name} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink-900">{d.leader.name}</div>
              <div className="text-xs text-ink-500">Leader{d.leader.phone ? ` · ${d.leader.phone}` : ''}</div>
            </div>
          </>
        ) : (
          <div className="text-sm text-ink-500">No leader chosen yet</div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="num font-display text-xl font-bold text-ink-900">{num(d.members_count)}</div>
          <div className="text-[11px] font-semibold uppercase text-ink-400">Members</div>
        </div>
        <div>
          <div className="num font-display text-xl font-bold text-ink-900">{num(d.reports_count)}</div>
          <div className="text-[11px] font-semibold uppercase text-ink-400">Reports</div>
        </div>
        <div>
          <div className="font-display text-sm font-bold leading-7 text-ink-900">{d.last_report_date ? fmtDate(d.last_report_date, 'd MMM') : '—'}</div>
          <div className="text-[11px] font-semibold uppercase text-ink-400">Last report</div>
        </div>
      </div>
    </Link>
  )
}

export function DepartmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)
  const { data: d, loading, error } = useApi(() => Api.get(id), [id])
  const { data: members } = useApi(() => Api.members(id), [id])
  const { data: reports } = useApi(() => Api.reports(id), [id])
  const [editing, setEditing] = useState(null)
  const [addingMember, setAddingMember] = useState(false)
  const [addingReport, setAddingReport] = useState(false)
  const [issuing, setIssuing] = useState(false)

  if (loading)
    return (
      <Card>
        <Loading />
      </Card>
    )
  if (error || !d)
    return (
      <Card>
        <Empty icon={Network} title="Department not found" body={error} action={<Button onClick={() => navigate('/departments')}>Back to departments</Button>} />
      </Card>
    )

  const isSecretary = user.role === 'secretary' && user.branch_id === d.branch_id
  const canManage = d.active && (isSecretary || (user.role === 'dept_leader' && user.department_id === d.id))

  return (
    <div>
      {user.role !== 'dept_leader' && (
        <Link to="/departments" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-altar-700">
          <ArrowLeft className="h-4 w-4" /> Departments
        </Link>
      )}
      <PageHeader
        eyebrow={user.role === 'dept_leader' ? 'My department' : 'Department'}
        title={d.name}
        subtitle={d.description || (d.active ? undefined : 'This department is closed.')}
        actions={
          <>
            {isSecretary && (
              <Button variant="secondary" icon={Pencil} onClick={() => setEditing(d)}>
                Edit
              </Button>
            )}
            {isSecretary && d.active && (
              <Button variant="secondary" icon={KeyRound} onClick={() => setIssuing(true)}>
                {d.login_email ? 'Reset login' : 'Give leader a login'}
              </Button>
            )}
            {canManage && (
              <Button icon={FilePlus2} onClick={() => setAddingReport(true)}>
                New report
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <PersonCard label="Leader" person={d.leader} extra={d.login_email ? `Signs in as ${d.login_email}` : isSecretary && d.leader ? 'No login yet' : null} />
        <PersonCard label="Assistant leader" person={d.assistant} />
        <Card className="flex items-center gap-4 p-5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-altar-50 text-altar-700">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="num font-display text-2xl font-bold">{num(d.members_count)}</div>
            <div className="text-xs font-semibold uppercase text-ink-400">Members · {num(d.reports_count)} reports</div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Reports & activities" subtitle="What the department has done, newest first" />
          {!reports ? (
            <Loading />
          ) : !reports.length ? (
            <Empty icon={CalendarDays} title="No reports yet" body={canManage ? 'Use “New report” after each activity — a meeting, a service you served at, an event.' : undefined} />
          ) : (
            <div className="divide-y divide-ink-100">
              {reports.map((r) => (
                <div key={r.id} className="flex gap-4 px-5 py-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-flame-50 text-center leading-none">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-flame-700">{fmtDate(r.date, 'MMM')}</div>
                      <div className="font-display text-lg font-bold text-ink-900">{fmtDate(r.date, 'd')}</div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink-900">{r.title}</div>
                    {r.details && <p className="mt-1 whitespace-pre-line text-sm text-ink-600">{r.details}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-ink-400">
                      <span>{fmtDate(r.date, 'EEEE d MMMM yyyy')}</span>
                      {r.people_involved != null && <span>{r.people_involved} people</span>}
                      {r.submitted_by && <span>by {r.submitted_by}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Members"
            action={
              canManage && (
                <Button size="sm" variant="secondary" icon={UserPlus} onClick={() => setAddingMember(true)}>
                  Add
                </Button>
              )
            }
          />
          {!members ? (
            <Loading />
          ) : !members.length ? (
            <Empty icon={Users} title="No members yet" />
          ) : (
            <div className="divide-y divide-ink-100">
              {members.map((m) => (
                <MemberRow key={m.id} m={m} depId={d.id} canManage={canManage && !['Leader', 'Assistant leader'].includes(m.role)} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <DepartmentForm dep={editing} onClose={() => setEditing(null)} />
      <AddMember open={addingMember} depId={d.id} onClose={() => setAddingMember(false)} />
      <AddReport open={addingReport} depId={d.id} onClose={() => setAddingReport(false)} />
      <IssueLogin open={issuing} dep={d} onClose={() => setIssuing(false)} />
    </div>
  )
}

function PersonCard({ label, person, extra }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      {person ? (
        <>
          <Avatar name={person.name} size={48} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase text-ink-400">{label}</div>
            <div className="truncate font-semibold text-ink-900">{person.name}</div>
            {person.phone && (
              <a href={`tel:${person.phone}`} className="num inline-flex items-center gap-1 text-sm text-altar-700 hover:underline">
                <Phone className="h-3.5 w-3.5" /> {person.phone}
              </a>
            )}
            {extra && <div className="truncate text-xs text-ink-400">{extra}</div>}
          </div>
        </>
      ) : (
        <div>
          <div className="text-xs font-semibold uppercase text-ink-400">{label}</div>
          <div className="text-sm text-ink-500">Not chosen yet</div>
        </div>
      )}
    </Card>
  )
}

function MemberRow({ m, depId, canManage }) {
  const [sure, setSure] = useState(false)
  const [remove, busy] = useMutation(() => Api.removeMember(depId, m.id), { success: `${m.name} removed` })
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <Avatar name={m.name} size={34} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink-900">{m.name}</div>
        <div className="flex flex-wrap gap-x-2 text-xs text-ink-500">
          {m.role && <span>{m.role}</span>}
          {m.phone && (
            <a href={`tel:${m.phone}`} className="num text-altar-700 hover:underline">
              {m.phone}
            </a>
          )}
        </div>
      </div>
      {['Leader', 'Assistant leader'].includes(m.role) && <Badge tone="altar">{m.role}</Badge>}
      {canManage &&
        (sure ? (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setSure(false)}>
              Keep
            </Button>
            <Button size="sm" variant="danger" loading={busy} onClick={() => remove()}>
              Remove
            </Button>
          </div>
        ) : (
          <button onClick={() => setSure(true)} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${m.name}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        ))}
    </div>
  )
}

function DepartmentForm({ dep, onClose }) {
  const isNew = dep && !dep.id
  const empty = { name: '', description: '', leader_member_id: '', assistant_member_id: '', active: true }
  const { data: members } = useApi(() => (dep ? MembersApi.list({ status: 'Active' }) : Promise.resolve([])), [!!dep])
  const values = dep ? { ...empty, ...dep, description: dep.description || '', leader_member_id: dep.leader_member_id || '', assistant_member_id: dep.assistant_member_id || '', active: dep.active ?? true } : empty
  const { register, handleSubmit, reset, setError, formState } = useForm({ values })
  const [serverError, setServerError] = useState(null)
  const [save, busy] = useMutation((body) => (isNew ? Api.create(body) : Api.update(dep.id, body)), { success: (x) => (isNew ? `${x.name} created` : 'Department updated') })
  const err = (k) => formState.errors[k]?.message
  const close = () => {
    reset(empty)
    setServerError(null)
    onClose()
  }
  const onSubmit = useSubmit(save, close, setError, setServerError)
  const people = members || []
  return (
    <Modal
      open={!!dep}
      onClose={close}
      title={isNew ? 'New department' : `Edit ${dep?.name}`}
      subtitle="Choose the leader from your members. The leader and assistant are added to the department automatically."
      width="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={busy}>
            {isNew ? 'Create department' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={err('name')} className="sm:col-span-2">
          <Input id="dep-name" placeholder="e.g. Media" {...register('name', { required: 'Give the department a name' })} error={err('name')} />
        </Field>
        <Field label="What the department does" className="sm:col-span-2">
          <Textarea id="dep-desc" placeholder="e.g. Live streaming, sound and projection on Sundays" {...register('description')} />
        </Field>
        <Field label="Leader" error={err('leader_member_id')} hint={people.length ? undefined : 'Add members first, then choose the leader'}>
          <Select id="dep-leader" {...register('leader_member_id')} error={err('leader_member_id')}>
            <option value="">— Not set —</option>
            {people.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Assistant leader" error={err('assistant_member_id')}>
          <Select id="dep-assistant" {...register('assistant_member_id')} error={err('assistant_member_id')}>
            <option value="">— Not set —</option>
            {people.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </Select>
        </Field>
        {!isNew && (
          <label className="flex items-center gap-2 text-sm text-ink-700 sm:col-span-2">
            <input type="checkbox" className="h-4 w-4 accent-altar-600" {...register('active')} />
            Department is active (untick to close it — its leader’s login stops working)
          </label>
        )}
        <div className="sm:col-span-2">
          <ErrorNote>{serverError}</ErrorNote>
        </div>
      </form>
    </Modal>
  )
}

function AddMember({ open, depId, onClose }) {
  const empty = { member_id: '', role: '' }
  const { data: candidates } = useApi(() => (open ? Api.candidates(depId) : Promise.resolve([])), [open, depId])
  const { register, handleSubmit, reset, setError, formState } = useForm({ defaultValues: empty })
  const [serverError, setServerError] = useState(null)
  const [save, busy] = useMutation((body) => Api.addMember(depId, body), { success: 'Member added' })
  const err = (k) => formState.errors[k]?.message
  const close = () => {
    reset(empty)
    setServerError(null)
    onClose()
  }
  const onSubmit = useSubmit(save, close, setError, setServerError)
  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a member"
      subtitle="Only members of this branch can be added."
      width="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={busy}>
            Add member
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Member" error={err('member_id')} hint={candidates && !candidates.length ? 'Everyone in the branch is already in this department' : undefined}>
          <Select id="dep-member" {...register('member_id', { required: 'Choose a member' })} error={err('member_id')}>
            <option value="">— Choose —</option>
            {(candidates || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Role in the department" hint="Optional — e.g. Camera, Sound, Secretary">
          <Input id="dep-role" {...register('role')} />
        </Field>
        <ErrorNote>{serverError}</ErrorNote>
      </form>
    </Modal>
  )
}

function AddReport({ open, depId, onClose }) {
  const empty = { date: format(today(), 'yyyy-MM-dd'), title: '', details: '', people_involved: '' }
  const { register, handleSubmit, reset, setError, formState } = useForm({ defaultValues: empty })
  const [serverError, setServerError] = useState(null)
  const [save, busy] = useMutation((body) => Api.addReport(depId, body), { success: 'Report saved' })
  const err = (k) => formState.errors[k]?.message
  const close = () => {
    reset(empty)
    setServerError(null)
    onClose()
  }
  const onSubmit = useSubmit(save, close, setError, setServerError)
  return (
    <Modal
      open={open}
      onClose={close}
      title="New report"
      subtitle="Record an activity, meeting or event the department held or served at."
      width="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={busy}>
            Save report
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" error={err('date')}>
          <Input id="rep-date" type="date" {...register('date', { required: 'Required' })} error={err('date')} />
        </Field>
        <Field label="People involved" hint="Optional">
          <Input id="rep-people" type="number" min="0" inputMode="numeric" className="num" {...register('people_involved')} />
        </Field>
        <Field label="Title" error={err('title')} className="sm:col-span-2">
          <Input id="rep-title" placeholder="e.g. Streamed the Sunday Main Service" {...register('title', { required: 'Give the report a title' })} error={err('title')} />
        </Field>
        <Field label="Details" className="sm:col-span-2">
          <Textarea id="rep-details" rows={5} placeholder="What happened, who served, anything the office should know or follow up" {...register('details')} />
        </Field>
        <div className="sm:col-span-2">
          <ErrorNote>{serverError}</ErrorNote>
        </div>
      </form>
    </Modal>
  )
}

function IssueLogin({ open, dep, onClose }) {
  const suggestion = `${dep.name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')}@laim.church`
  const { register, handleSubmit, reset, setError, formState } = useForm({ values: { email: dep.login_email || suggestion } })
  const [serverError, setServerError] = useState(null)
  const [issued, setIssued] = useState(null)
  const [copied, setCopied] = useState(false)
  const [save, busy] = useMutation((body) => Api.issueLogin(dep.id, body))
  const err = (k) => formState.errors[k]?.message
  const close = () => {
    reset()
    setIssued(null)
    setCopied(false)
    setServerError(null)
    onClose()
  }
  const onSubmit = useSubmit(save, setIssued, setError, setServerError)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`LAIM Office — ${window.location.origin}\nEmail: ${issued.email}\nPassword: ${issued.password}`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={close}
      title={issued ? 'Login ready' : dep.login_email ? 'Reset the leader’s login' : 'Give the leader a login'}
      subtitle={issued ? 'Give these details to the leader in person or by SMS. The password is shown only once.' : `${dep.leader?.name || 'The leader'} will only see this department — no tithes or other members' records.`}
      width="max-w-md"
      footer={
        issued ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} loading={busy} disabled={!dep.leader}>
              {dep.login_email ? 'Make a new password' : 'Create login'}
            </Button>
          </>
        )
      }
    >
      {issued ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-linen p-4">
            <div className="text-xs font-semibold uppercase text-ink-400">Email</div>
            <div className="num font-semibold text-ink-900">{issued.email}</div>
            <div className="mt-3 text-xs font-semibold uppercase text-ink-400">Password</div>
            <div className="num text-lg font-bold tracking-wide text-altar-700">{issued.password}</div>
          </div>
          <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>
            {copied ? 'Copied' : 'Copy details'}
          </Button>
          <p className="text-xs text-ink-500">They should change it after signing in, with the key button next to Sign out.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!dep.leader && <ErrorNote>Choose the department leader first (Edit).</ErrorNote>}
          <Field label="Login email" error={err('email')} hint={dep.login_email ? 'A new password replaces the old one straight away.' : 'Any email works — it is only used to sign in.'}>
            <Input id="dep-email" type="email" autoComplete="off" {...register('email', { required: 'Enter an email' })} error={err('email')} />
          </Field>
          <ErrorNote>{serverError}</ErrorNote>
        </form>
      )}
    </Modal>
  )
}

