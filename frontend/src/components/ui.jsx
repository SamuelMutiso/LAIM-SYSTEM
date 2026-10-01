import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { AlertTriangle, Check, ChevronDown, Loader2, Search, X } from 'lucide-react'
import { cx, initials } from '../lib/utils'
import { branchById } from '../lib/constants'
import { dismissToast } from '../app/store'

export function Button({ variant = 'primary', size = 'md', className, loading, icon: Icon, children, ...props }) {
  const styles = {
    primary: 'bg-altar-600 text-white hover:bg-altar-700 shadow-sm shadow-altar-900/20',
    gold: 'bg-flame-400 text-altar-900 hover:bg-flame-300 shadow-sm shadow-flame-700/20',
    secondary: 'bg-white text-ink-900 border border-ink-200 hover:border-ink-300 hover:bg-ink-100/50',
    ghost: 'text-ink-700 hover:bg-ink-100',
    danger: 'bg-scripture-600 text-white hover:bg-scripture-700',
  }
  const sizes = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-5 text-sm gap-2' }
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        styles[variant],
        sizes[size],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  )
}

export function Card({ className, children, ...p }) {
  return (
    <div className={cx('card', className)} {...p}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-flame-600">{eyebrow}</div>}
        <h1 className="text-2xl font-bold text-ink-900 sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, sub, icon: Icon, tone = 'altar', trend }) {
  const tones = {
    altar: 'bg-altar-50 text-altar-600',
    flame: 'bg-flame-50 text-flame-700',
    scripture: 'bg-scripture-50 text-scripture-600',
    ink: 'bg-ink-100 text-ink-700',
  }
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</span>
        {Icon && (
          <span className={cx('grid h-9 w-9 place-items-center rounded-xl', tones[tone])}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <div className="mt-3 font-display text-[26px] font-bold leading-none text-ink-900">{value}</div>
      {(sub || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
          {trend}
          {sub}
        </div>
      )}
    </Card>
  )
}

export function Trend({ now, before }) {
  if (!before) return null
  const pct = Math.round(((now - before) / before) * 100)
  const up = pct >= 0
  return (
    <span className={cx('rounded-md px-1.5 py-0.5 font-semibold', up ? 'bg-emerald-50 text-emerald-700' : 'bg-scripture-50 text-scripture-700')}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  )
}

export function Badge({ tone = 'ink', children, className }) {
  const tones = {
    ink: 'bg-ink-100 text-ink-700',
    altar: 'bg-altar-50 text-altar-700',
    flame: 'bg-flame-100 text-flame-800',
    scripture: 'bg-scripture-50 text-scripture-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
  }
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', tones[tone], className)}>{children}</span>
}

export function BranchTag({ id, short = true }) {
  const b = branchById(id)
  if (!b) return null
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-ink-700">
      <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
      {short ? b.short : b.name}
    </span>
  )
}

export function Avatar({ name, size = 36, tone }) {
  const palette = ['bg-altar-100 text-altar-700', 'bg-flame-100 text-flame-800', 'bg-scripture-100 text-scripture-700', 'bg-ink-100 text-ink-700']
  const idx = tone ?? [...(name || '')].reduce((t, c) => t + c.charCodeAt(0), 0) % palette.length
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-full font-display font-semibold', palette[idx])} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name)}
    </span>
  )
}

export const Field = ({ label, error, hint, children, className }) => (
  <label className={cx('block', className)}>
    {label && <span className="label">{label}</span>}
    {children}
    {error ? <span className="mt-1 block text-xs font-medium text-scripture-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-ink-400">{hint}</span> : null}
  </label>
)

export const Input = forwardRef(function Input({ className, error, ...p }, ref) {
  return <input ref={ref} className={cx('input', error && 'input-error', className)} {...p} />
})

export const Select = forwardRef(function Select({ className, error, children, ...p }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cx('input appearance-none pr-9', error && 'input-error', className)} {...p}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
    </div>
  )
})

export const Textarea = forwardRef(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} rows={3} className={cx('input resize-none', className)} {...p} />
})

export function SearchBox({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input className="input pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-2xl' }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-altar-950/50 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cx('relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white text-ink-900 shadow-lift sm:rounded-3xl', width)}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
            {footer && <div className="pb-safe flex flex-wrap justify-end gap-2 border-t border-ink-100 px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Drawer({ open, onClose, children, width = 'max-w-xl' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-altar-950/40" onClick={onClose} />
          <motion.div
            className={cx('absolute inset-y-0 right-0 flex w-full flex-col bg-linen shadow-lift', width)}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-lg bg-white/80 p-1.5 text-ink-500 shadow hover:text-ink-900" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            <div className="flex-1 overflow-y-auto scrollbar-thin">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-ink-200/70 bg-white p-1 shadow-card scrollbar-thin sm:inline-flex">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cx(
            'relative flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition',
            value === t.key ? 'text-white' : 'text-ink-500 hover:text-ink-900',
          )}
        >
          {value === t.key && <motion.span layoutId={`tab-${tabs.map((x) => x.key).join('')}`} className="absolute inset-0 rounded-xl bg-altar-600" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />}
          <span className="relative flex items-center gap-2">
            {t.icon && <t.icon className="h-4 w-4" />}
            {t.label}
          </span>
        </button>
      ))}
    </div>
  )
}

export function Chips({ options, value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {options.map((o) => {
        const active = value === o.key
        return (
          <button
            key={o.key || 'all'}
            onClick={() => onChange(o.key)}
            className={cx('chip', active ? 'border-altar-600 bg-altar-600 text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300')}
          >
            {o.label}
            {o.count !== undefined && <span className={cx('num rounded-full px-1.5 text-[10px]', active ? 'bg-white/20' : 'bg-ink-100 text-ink-500')}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Empty({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-altar-50 text-altar-500">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <div className="font-display font-semibold text-ink-900">{title}</div>
      {body && <p className="mt-1 max-w-sm text-sm text-ink-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Loading({ rows = 5 }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-xl bg-ink-100" style={{ opacity: 1 - i * 0.14 }} />
      ))}
    </div>
  )
}

export function ErrorNote({ children }) {
  if (!children) return null
  return (
    <div className="flex items-start gap-2 rounded-xl border border-scripture-200 bg-scripture-50 px-3.5 py-2.5 text-sm text-scripture-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

export function Toasts() {
  const toasts = useSelector((s) => s.ui.toasts)
  const dispatch = useDispatch()
  useEffect(() => {
    if (!toasts.length) return
    const t = setTimeout(() => dispatch(dismissToast(toasts[0].id)), 3200)
    return () => clearTimeout(t)
  }, [toasts, dispatch])
  return (
    <div className="mb-safe pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0 }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-altar-900 px-4 py-3 text-sm font-medium text-white shadow-lift"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-flame-400 text-altar-900">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function MemberPicker({ members = [], value, onChange, error, placeholder = 'Type a name or phone…', filter }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const selected = members.find((m) => m.id === Number(value))
  const results = useMemo(() => {
    const s = q.toLowerCase()
    return members
      .filter((m) => (!filter || filter(m)) && (!s || m.full_name.toLowerCase().includes(s) || (m.phone || '').includes(s)))
      .slice(0, 8)
  }, [q, members, filter])
  useEffect(() => {
    const h = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div className="relative" ref={box}>
      {selected && !open ? (
        <button type="button" onClick={() => setOpen(true)} className={cx('input flex items-center gap-3 text-left', error && 'input-error')}>
          <Avatar name={selected.full_name} size={26} />
          <span className="flex-1 truncate font-medium">{selected.full_name}</span>
          <span className="num text-xs text-ink-400">{selected.phone}</span>
        </button>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            autoFocus={open}
            className={cx('input pl-9', error && 'input-error')}
            value={q}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value)
              setOpen(true)
            }}
          />
        </div>
      )}
      {open && (
        <div className="absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-2xl border border-ink-200 bg-white p-1.5 shadow-lift scrollbar-thin">
          {results.length === 0 && <div className="px-3 py-4 text-center text-sm text-ink-500">No member matches “{q}”</div>}
          {results.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => {
                onChange(m.id)
                setQ('')
                setOpen(false)
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-altar-50"
            >
              <Avatar name={m.full_name} size={28} />
              <span className="flex-1">
                <span className="block text-sm font-medium text-ink-900">{m.full_name}</span>
                <span className="block text-xs text-ink-500">{m.home_church} · {m.residence}</span>
              </span>
              <span className="num text-xs text-ink-400">{m.phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReadOnlyNote({ role }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-altar-50 px-3.5 py-2 text-xs font-medium text-altar-700">
      <span className="h-1.5 w-1.5 rounded-full bg-altar-500" />
      {role === 'bishop' ? 'Viewing all branches. Records are entered by each branch secretary.' : 'View only — records are entered by your branch secretary.'}
    </div>
  )
}

export function PledgeStatus({ status }) {
  const tone = { 'Fully Paid': 'green', 'Partly Paid': 'flame', Overdue: 'red', 'Not Started': 'ink' }[status]
  return <Badge tone={tone}>{status}</Badge>
}
