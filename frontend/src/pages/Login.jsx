import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { login } from '../app/store'
import { LogoMark } from '../components/Brand'
import { Button, ErrorNote } from '../components/ui'
import { BRANCHES } from '../lib/constants'
import { asset } from '../lib/utils'


const LED = 'linear-gradient(90deg,#22C55E 0%,#3B82F6 30%,#8B5CF6 58%,#EC4899 82%,#F2C811 100%)'

function Chevrons({ className }) {

  return (
    <svg viewBox="0 0 220 260" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="chev-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FDF0BF" />
          <stop offset="1" stopColor="#E0A812" />
        </linearGradient>
      </defs>
      <path d="M150 0 L205 0 L125 130 L205 260 L150 260 L70 130 Z" fill="url(#chev-gold)" opacity=".9" />
      <path d="M80 0 L125 0 L45 130 L125 260 L80 260 L0 130 Z" fill="#fff" opacity=".85" />
    </svg>
  )
}

const PHOTOS = [
  { name: 'stage', alt: "The stage at Lord's Altar Ministries International", pos: '50% 62%' },
  { name: 'band', alt: 'The praise team leading worship', pos: '62% 50%' },
  { name: 'pulpit', alt: 'The Bishop preaching with the praise team', pos: '45% 40%' },
  { name: 'pulpit-wide', alt: 'The Bishop at the pulpit during the Passover Convention', pos: '50% 40%' },
]

function StagePhotos() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const t = setInterval(() => setIndex((i) => (i + 1) % PHOTOS.length), 8000)
    return () => clearInterval(t)
  }, [])
  return PHOTOS.map((p, i) => (
    <img
      key={p.name}
      src={asset(`brand/${p.name}.jpg`)}
      srcSet={`${asset(`brand/${p.name}-sm.jpg`)} 700w, ${asset(`brand/${p.name}.jpg`)} 1500w`}
      sizes="(min-width:1024px) 56vw, 100vw"
      alt={i === index ? p.alt : ''}
      aria-hidden={i !== index}
      loading={i === 0 ? 'eager' : 'lazy'}
      style={{ objectPosition: p.pos }}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ease-in-out ${i === index ? 'opacity-100' : 'opacity-0'}`}
    />
  ))
}

export default function Login() {
  const dispatch = useDispatch()
  const { user, status, error } = useSelector((s) => s.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)

  if (user) return <Navigate to={user.role === 'cell_leader' ? '/home-church' : '/'} replace />

  const submit = (e) => {
    e.preventDefault()
    dispatch(login({ email, password }))
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-altar-900 lg:grid lg:grid-cols-[1.25fr_1fr]">
      <section className="relative h-72 overflow-hidden sm:h-80 lg:h-auto lg:min-h-screen">
        <StagePhotos />
        <div className="absolute inset-0 bg-gradient-to-t from-altar-950 via-altar-900/55 to-altar-900/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-altar-950/70 via-transparent to-transparent" />
        <div className="absolute inset-0 mix-blend-soft-light" style={{ background: 'radial-gradient(ellipse at 85% 30%, rgba(139,92,246,.55), transparent 55%), radial-gradient(ellipse at 20% 90%, rgba(242,200,17,.45), transparent 55%)' }} />

        <motion.div className="absolute inset-x-0 top-0 h-1.5" style={{ background: LED, backgroundSize: '200% 100%' }} animate={{ backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'] }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} />

        <div className="absolute left-6 top-6 hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flame-400" /> Office system
        </div>

        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-14">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} className="flex items-end gap-4 sm:gap-5">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white p-2 shadow-2xl shadow-black/40 sm:h-20 sm:w-20 lg:h-24 lg:w-24">
              <LogoMark className="h-full w-full" />
            </span>
            <div>
              <div className="font-display text-2xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-5xl">
                Lord&rsquo;s Altar
                <span className="block bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg,#FAE17F,#F2C811 40%,#E0A812)' }}>
                  Ministries International
                </span>
              </div>
            </div>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.8 }} className="mt-5 hidden max-w-lg border-l-2 border-flame-400 pl-4 font-display text-lg leading-relaxed text-white/90 sm:block">
            “The fire shall ever be burning upon the altar; it shall never go out.”
            <span className="mt-1 block font-sans text-sm font-bold tracking-wide text-flame-300">Leviticus 6:13</span>
          </motion.p>
          <div className="mt-6 hidden flex-wrap gap-2 lg:flex">
            {BRANCHES.map((b) => b.short === 'HQ' ? 'LAIM HQ' : b.short).map((b) => (
              <span key={b} className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur">
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative flex items-center justify-center px-4 py-10 sm:px-8 lg:py-12">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-altar-700 via-altar-800 to-altar-950" />
        <div className="pointer-events-none absolute -right-24 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-[#8B5CF6]/30 blur-[90px]" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-72 w-72 rounded-full bg-[#22C55E]/15 blur-[80px]" />
        <Chevrons className="pointer-events-none absolute -right-6 top-10 hidden h-64 w-56 opacity-25 lg:block" />
        <Chevrons className="pointer-events-none absolute -left-16 bottom-8 hidden h-40 w-36 rotate-180 opacity-10 lg:block" />

        <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }} className="relative w-full max-w-md">
          <div className="overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-black/40">
            <div className="h-1.5" style={{ background: LED }} />
            <div className="p-7 sm:p-9">
              <div className="mb-7">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-scripture-600">LAIM Office</div>
                  <h1 className="mt-1 text-[28px] font-bold leading-tight text-ink-900">Welcome back</h1>
                  <p className="mt-1 text-sm text-ink-500">Sign in to continue serving.</p>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <label className="block" htmlFor="login-email">
                  <span className="label">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input id="login-email" className="input h-12 pl-10" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@laim.church" required />
                  </div>
                </label>
                <label className="block" htmlFor="login-password">
                  <span className="label">Password</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input id="login-password" className="input h-12 pl-10 pr-11" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
                    <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-400 hover:text-ink-700" aria-label={show ? 'Hide password' : 'Show password'}>
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
                <ErrorNote>{error}</ErrorNote>
                <Button type="submit" size="lg" className="group w-full bg-gradient-to-r from-altar-600 to-altar-500 hover:from-altar-700 hover:to-altar-600" loading={status === 'loading'}>
                  Sign in <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Button>
              </form>
              <p className="mt-5 text-center text-xs text-ink-400">Forgot your password? Ask the church office to reset it.</p>
            </div>
          </div>
          <p className="mt-5 text-center text-xs text-altar-200/80">Authorised church staff only</p>
        </motion.div>
      </section>
    </div>
  )
}
