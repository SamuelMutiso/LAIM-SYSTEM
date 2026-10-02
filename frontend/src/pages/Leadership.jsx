import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { Crown, History, Mail, Mic2, Phone, Plus } from 'lucide-react'
import { Leaders, Members } from '../api/services'
import { errorField, errorMessage } from '../api/client'
import { useApi, useMutation } from '../app/hooks'
import { selectBranchParam, selectCanWrite } from '../app/store'
import { Avatar, BranchTag, Button, Card, CardHeader, ErrorNote, Field, Input, Loading, MemberPicker, Modal, PageHeader, ReadOnlyNote } from '../components/ui'
import { fmtDate, today } from '../lib/utils'

const ROLE_SUGGESTIONS = [
  'Bishop',
  'Assistant Bishop',
  'Senior Pastor — HQ',
  'Pastor — Korrompoi',
  'Pastor — Milimani',
  'Pastor — Matuu',
  'Youth Pastor',
  'Sunday School Leader',
  'Worship Leader',
  'Head of Media Team',
  "Women's Fellowship Leader",
  "Men's Fellowship Leader",
  'Head Usher',
  'Church Treasurer',
  'Branch Secretary',
  'Intercessors Leader',
  'Choir Director',
]

export default function Leadership() {
  const user = useSelector((s) => s.auth.user)
  const canWrite = useSelector(selectCanWrite)
  const branch_id = useSelector(selectBranchParam)
  const { data: leaders, loading } = useApi(() => Leaders.list(), [])
  const { data: team } = useApi(() => Leaders.worshipTeam(), [])
  const [assigning, setAssigning] = useState(false)

  const inScope = (l) => !branch_id || l.scope === 'church' || l.branch_id === Number(branch_id)
  const active = (leaders || []).filter((l) => l.active && inScope(l))
  const past = (leaders || []).filter((l) => !l.active && inScope(l))
  const top = active.filter((l) => ['Bishop', 'Assistant Bishop'].includes(l.role))
  const pastors = active.filter((l) => l.role.startsWith('Pastor') || l.role.startsWith('Senior Pastor'))
  const rest = active.filter((l) => !top.includes(l) && !pastors.includes(l))

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Leadership & Contacts"
        subtitle="Who is in charge of what — with a phone number one tap away."
        actions={
          canWrite && (
            <Button icon={Plus} onClick={() => setAssigning(true)}>
              Assign a role
            </Button>
          )
        }
      />
      {!canWrite && (
        <div className="mb-4">
          <ReadOnlyNote role={user.role} />
        </div>
      )}
      {loading ? (
        <Card>
          <Loading />
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            {top.map((l) => (
              <Card key={l.id} className="relative overflow-hidden p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-altar-900 to-altar-700" />
                <div className="absolute inset-0 bg-flame-glow opacity-60" />
                <div className="relative flex items-center gap-4 text-white">
                  <Avatar name={l.name.replace('Bishop Dr. ', '')} size={64} tone={1} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-flame-300">
                      <Crown className="h-3.5 w-3.5" /> {l.role}
                    </div>
                    <div className="mt-1 truncate font-display text-xl font-bold">{l.name}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {l.phone && <ContactButton href={`tel:${l.phone}`} icon={Phone} light label={l.phone} />}
                      {l.email && <ContactButton href={`mailto:${l.email}`} icon={Mail} light label="Email" />}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Section title="Pastors">
            {pastors.map((l) => (
              <PersonCard key={l.id} l={l} />
            ))}
          </Section>
          <Section title="Ministries & office">
            {rest.map((l) => (
              <PersonCard key={l.id} l={l} showBranch={user.role === 'bishop'} />
            ))}
          </Section>

          <Card>
            <CardHeader title="Current worship team" subtitle="Praise & worship practice — Saturdays from 5:30 PM" action={<Mic2 className="h-5 w-5 text-ink-300" />} />
            <div className="mt-3 overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[560px]">
                <thead className="bg-linen/60">
                  <tr>
                    <th className="th">Name</th>
                    <th className="th">Role</th>
                    <th className="th">Part / instrument</th>
                    <th className="th">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {team?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="td text-center text-ink-500">
                        No worship team members added yet.
                      </td>
                    </tr>
                  )}
                  {(team || []).map((w) => (
                    <tr key={w.id} className="border-t border-ink-100">
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={w.name} size={30} />
                          <span className="font-semibold text-ink-900">{w.name}</span>
                        </div>
                      </td>
                      <td className="td">{w.role}</td>
                      <td className="td">{w.part}</td>
                      <td className="td">
                        <a href={`tel:${w.phone}`} className="num text-altar-700 hover:underline">
                          {w.phone}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {past.length > 0 && (
            <Card>
              <CardHeader title="Past role holders" subtitle="Kept when someone is replaced" action={<History className="h-5 w-5 text-ink-300" />} />
              <div className="mt-3 divide-y divide-ink-100">
                {past.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <Avatar name={l.name} size={30} />
                    <span className="flex-1 font-medium">{l.name}</span>
                    <span className="text-ink-500">{l.role}</span>
                    <span className="text-xs text-ink-400">
                      {fmtDate(l.since, 'yyyy')} – {fmtDate(l.until, 'yyyy')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
      <AssignRole open={assigning} onClose={() => setAssigning(false)} />
    </div>
  )
}

function Section({ title, children }) {
  if (!children || children.length === 0) return null
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-ink-500">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  )
}

function ContactButton({ href, icon: Icon, label, light }) {
  return (
    <a href={href} className={light ? 'inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/25' : 'inline-flex items-center gap-1.5 rounded-lg bg-altar-50 px-2.5 py-1 text-xs font-semibold text-altar-700 hover:bg-altar-100'}>
      <Icon className="h-3.5 w-3.5" />
      <span className="num">{label}</span>
    </a>
  )
}

function PersonCard({ l, showBranch }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <Avatar name={l.name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wide text-flame-600">{l.role}</div>
          <div className="truncate font-display font-semibold text-ink-900">{l.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
            since {fmtDate(l.since, 'MMM yyyy')}
            {showBranch && l.scope === 'branch' && <BranchTag id={l.branch_id} />}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {l.phone && <ContactButton href={`tel:${l.phone}`} icon={Phone} label={l.phone} />}
        {l.email && <ContactButton href={`mailto:${l.email}`} icon={Mail} label="Email" />}
      </div>
    </Card>
  )
}

function AssignRole({ open, onClose }) {
  const { data: members } = useApi(() => (open ? Members.list({ status: 'Active' }) : Promise.resolve([])), [open])
  const defaults = { role: '', member_id: '', since: format(today(), 'yyyy-MM-dd') }
  const { register, handleSubmit, setValue, watch, reset, setError, clearErrors, formState } = useForm({ defaultValues: defaults })
  const [serverError, setServerError] = useState(null)
  const [save, busy] = useMutation(Leaders.assign, { success: (l) => `${l.name} is now ${l.role}` })
  register('member_id', { required: 'Pick the member' })
  const onSubmit = async (body) => {
    setServerError(null)
    const { error } = await save(body)
    if (error) {
      const f = errorField(error)
      if (f) setError(f, { message: errorMessage(error) })
      else setServerError(errorMessage(error))
      return
    }
    reset(defaults)
    onClose()
  }
  const err = (k) => formState.errors[k]?.message
  return (
    <Modal open={open} onClose={onClose} title="Assign a role" subtitle="If someone already holds this role, they move to “past role holders”." width="max-w-lg" footer={<Button onClick={handleSubmit(onSubmit)} loading={busy}>Save</Button>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Role" error={err('role')}>
          <Input list="role-suggestions" {...register('role', { required: 'Enter the role' })} error={err('role')} placeholder="e.g. Worship Leader" />
          <datalist id="role-suggestions">
            {ROLE_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <Field label="Member" error={err('member_id')}>
          <MemberPicker
            members={members || []}
            value={watch('member_id')}
            error={err('member_id')}
            onChange={(id) => {
              setValue('member_id', id)
              clearErrors('member_id')
            }}
          />
        </Field>
        <Field label="Since">
          <Input type="date" {...register('since')} />
        </Field>
        <ErrorNote>{serverError}</ErrorNote>
      </form>
    </Modal>
  )
}
