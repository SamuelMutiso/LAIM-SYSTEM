import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpenText,
  Boxes,
  CalendarDays,
  ClipboardList,
  Coins,
  HandCoins,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  ShieldCheck,
  Users,
  UserRoundCog,
  Wallet,

} from 'lucide-react'
import { Wordmark, YoutubeIcon, FacebookIcon } from '../components/Brand'
import { Avatar, Select } from '../components/ui'
import { bumpData, logout, setBranchFilter, setSidebar } from '../app/store'
import ChangePassword from '../components/ChangePassword'
import { BRANCHES, ROLES, SOCIAL, branchById } from '../lib/constants'
import { cx } from '../lib/utils'
import api, { tokens } from '../api/client'

const NAV = [
  { section: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['bishop', 'pastor', 'secretary'] }] },
  {
    section: 'People',
    items: [
      { to: '/members', label: 'Members', icon: Users, roles: ['bishop', 'pastor', 'secretary'] },
      { to: '/home-church', label: 'Home Church', icon: Home, roles: ['bishop', 'pastor', 'secretary', 'cell_leader'] },
      { to: '/leadership', label: 'Leadership', icon: UserRoundCog, roles: ['bishop', 'pastor', 'secretary'] },
    ],
  },
  {
    section: 'Giving',
    items: [
      { to: '/tithe', label: 'Tithe', icon: Wallet, roles: ['bishop', 'pastor', 'secretary'] },
      { to: '/offering', label: 'Sunday Offering', icon: Coins, roles: ['bishop', 'pastor', 'secretary'] },
      { to: '/pledges', label: 'Pledges & Building', icon: HandCoins, roles: ['bishop', 'pastor', 'secretary'] },
    ],
  },
  {
    section: 'Church',
    items: [
      { to: '/activities', label: 'Activities', icon: CalendarDays, roles: ['bishop', 'pastor', 'secretary', 'cell_leader'] },
      { to: '/inventory', label: 'Inventory', icon: Boxes, roles: ['bishop', 'pastor', 'secretary'] },
      { to: '/forms', label: 'Forms', icon: ClipboardList, roles: ['bishop', 'pastor', 'secretary', 'cell_leader'] },
      { to: '/audit', label: 'Audit Log', icon: ScrollText, roles: ['bishop'] },
    ],
  },
]

function SidebarContent({ user, onNavigate }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [changingPassword, setChangingPassword] = useState(false)
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-altar-900 text-white">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-flame-glow opacity-60" />
      <div className="relative px-5 pb-5 pt-6">
        <Wordmark light />
      </div>
      <nav className="relative flex-1 space-y-6 overflow-y-auto px-3 pb-6 scrollbar-thin">
        {NAV.map((s) => {
          const items = s.items.filter((i) => i.roles.includes(user.role))
          if (!items.length) return null
          return (
            <div key={s.section}>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-altar-300/80">{s.section}</div>
              <div className="space-y-0.5">
                {items.map((i) => (
                  <NavLink
                    key={i.to}
                    to={i.to}
                    end={i.to === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cx(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                        isActive ? 'bg-white/10 text-white' : 'text-altar-100/75 hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <motion.span layoutId="nav-active" className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-flame-400" />}
                        <i.icon className={cx('h-[18px] w-[18px]', isActive ? 'text-flame-300' : 'text-altar-300 group-hover:text-altar-100')} />
                        {i.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>
      <div className="pb-safe relative border-t border-white/10 p-4">
        <div className="mb-3 flex gap-2">
          <a href={SOCIAL.youtubeLive} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 py-2 text-xs font-semibold text-altar-100 hover:bg-white/10">
            <YoutubeIcon className="h-4 w-4 text-red-400" /> Live
          </a>
          <a href={SOCIAL.facebook} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 py-2 text-xs font-semibold text-altar-100 hover:bg-white/10">
            <FacebookIcon className="h-4 w-4 text-sky-300" /> Facebook
          </a>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5">
          <Avatar name={user.name.replace('Bishop Dr. ', '')} size={36} tone={1} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="truncate text-[11px] text-altar-200">
              {ROLES[user.role].label} · {user.role === 'bishop' ? 'All branches' : branchById(user.branch_id)?.short}
            </div>
          </div>
          <button
            onClick={() => setChangingPassword(true)}
            className="rounded-lg p-2 text-altar-200 hover:bg-white/10 hover:text-white"
            title="Change password"
            aria-label="Change password"
          >
            <KeyRound className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              api.post('/auth/logout', null, { headers: { Authorization: `Bearer ${tokens.get()?.access_token}` } }).catch(() => {})
              dispatch(logout())
              navigate('/login')
            }}
            className="rounded-lg p-2 text-altar-200 hover:bg-white/10 hover:text-white"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      <ChangePassword open={changingPassword} onClose={() => setChangingPassword(false)} />
    </div>
  )
}

function useLiveRefresh() {
  const dispatch = useDispatch()
  useEffect(() => {
    const refresh = () => document.visibilityState === 'visible' && dispatch(bumpData())
    const timer = setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [dispatch])
}

export default function AppLayout() {
  const user = useSelector((s) => s.auth.user)
  const open = useSelector((s) => s.ui.sidebarOpen)
  const branchFilter = useSelector((s) => s.ui.branchFilter)
  const dispatch = useDispatch()
  const location = useLocation()
  useLiveRefresh()
  const scopeLabel = user.role === 'bishop' ? (branchFilter ? branchById(branchFilter)?.name : 'All branches') : branchById(user.branch_id)?.name

  return (
    <div className="min-h-screen lg:pl-[264px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block">
        <SidebarContent user={user} />
      </aside>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-altar-950/50" onClick={() => dispatch(setSidebar(false))} />
            <motion.div className="absolute inset-y-0 left-0 w-[272px]" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <SidebarContent user={user} onNavigate={() => dispatch(setSidebar(false))} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="pt-safe sticky top-0 z-30 border-b border-ink-200/60 bg-linen/85 backdrop-blur-md">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button className="rounded-xl p-2 text-ink-700 hover:bg-ink-100 lg:hidden" onClick={() => dispatch(setSidebar(true))} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 shrink-0 text-altar-500" />
            <span className="truncate font-semibold text-ink-700">{scopeLabel}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {user.role === 'bishop' && (
              <div className="w-44 sm:w-56">
                <Select value={branchFilter} onChange={(e) => dispatch(setBranchFilter(e.target.value))} aria-label="Branch" className="h-10 py-2">
                  <option value="">All branches</option>
                  {BRANCHES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {user.role !== 'bishop' && (
              <span className="hidden items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 sm:inline-flex">
                <BookOpenText className="h-3.5 w-3.5 text-scripture-600" /> {ROLES[user.role].scope}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mb-safe px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
