import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowRight, Cake, Coins, Droplets, Flame, HandCoins, Home, Sparkles, UserPlus, Users, Wallet } from 'lucide-react'
import { Dashboard as DashboardApi } from '../api/services'
import { useApi } from '../app/hooks'
import { selectBranchParam } from '../app/store'
import { Badge, BranchTag, Card, CardHeader, Loading, PageHeader, Stat, Trend } from '../components/ui'
import { YoutubeIcon, FacebookIcon } from '../components/Brand'
import { BRANCHES, DAYS, GROUPS, SOCIAL, WEEKLY_PROGRAMME, branchById, groupLabel } from '../lib/constants'
import { compactMoney, money, num, fmtDate, ageOf, today } from '../lib/utils'
import { upcomingMonthly } from '../lib/schedule'
import { IS_DEMO } from '../api/client'

const CHANNEL_UPLOADS = 'UUTvKlwkba8cRwGFJT3o3Pzg'

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs shadow-lift">
      <div className="mb-1 font-semibold text-ink-900">{format(parseISO(label + '-01'), 'MMMM yyyy')}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-ink-700">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="w-16">{p.name}</span>
          <span className="num font-semibold text-ink-900">{money(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const user = useSelector((s) => s.auth.user)
  const branch_id = useSelector(selectBranchParam)
  const { data: d, loading } = useApi(() => DashboardApi.get({ branch_id }), [branch_id])

  const TODAY = today()
  const thisMonth = format(TODAY, 'MMMM')
  const lastMonth = format(new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1), 'MMMM')
  const hello = user.role === 'bishop' ? 'Bishop Dr. Donald Mutiso' : user.name
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todays = WEEKLY_PROGRAMME.filter((p) => p.day === TODAY.getDay())
  const monthly = upcomingMonthly(TODAY).slice(0, 2)

  return (
    <div>
      <PageHeader eyebrow={format(TODAY, 'EEEE, d MMMM yyyy')} title={`${greet}, ${hello.split(' — ')[0]}`} subtitle="Here is how the church is doing this month." />

      {loading || !d ? (
        <Card>
          <Loading rows={6} />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Active members" value={num(d.members_total)} icon={Users} sub={`${d.by_gender.M} men · ${d.by_gender.F} women`} />
            <Stat label={`Tithe · ${thisMonth}`} value={compactMoney(d.tithe_month)} icon={Wallet} tone="flame" trend={<Trend now={d.tithe_month} before={d.tithe_prev_month} />} sub={`vs ${lastMonth}`} />
            <Stat label={`Offering · ${thisMonth}`} value={compactMoney(d.offering_month)} icon={Coins} tone="scripture" trend={<Trend now={d.offering_month} before={d.offering_prev_month} />} sub={`vs ${lastMonth}`} />
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Building fund</span>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-altar-50 text-altar-600">
                  <HandCoins className="h-[18px] w-[18px]" />
                </span>
              </div>
              <div className="mt-3 font-display text-[26px] font-bold leading-none">{compactMoney(d.building_fund_raised)}</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-gradient-to-r from-flame-400 to-flame-600" style={{ width: `${Math.min(100, (d.building_fund_raised / d.building_fund_target) * 100)}%` }} />
              </div>
              <div className="mt-2 text-xs text-ink-500">
                {Math.round((d.building_fund_raised / d.building_fund_target) * 100)}% of {compactMoney(d.building_fund_target)} target
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Giving by month"
                subtitle={`Tithe (first Sunday) and Sunday Main Service offering, ${TODAY.getFullYear()}`}
                action={
                  <Link to="/tithe" className="flex items-center gap-1 text-xs font-semibold text-altar-600 hover:text-altar-800">
                    Reports <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
              <div className="h-80 px-2 pb-4 pt-4">
                <ResponsiveContainer>
                  <BarChart data={d.trend} barGap={2} barCategoryGap="22%" margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#EEEEEA" />
                    <XAxis dataKey="month" tickFormatter={(m) => format(parseISO(m + '-01'), 'MMM')} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B6E6B' }} />
                    <YAxis tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}K` : v)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8E918D', fontFamily: 'JetBrains Mono' }} width={44} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(59,64,176,.06)' }} />
                    <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar isAnimationActive={false} dataKey="tithe" name="Tithe" fill="#3B40B0" radius={[4, 4, 0, 0]} maxBarSize={26} />
                    <Bar isAnimationActive={false} dataKey="offering" name="Offering" fill="#C78A10" radius={[4, 4, 0, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Members by group" subtitle="Grouped automatically by age & marital status" action={<Link to="/members" className="text-xs font-semibold text-altar-600">View all</Link>} />
              <div className="space-y-3.5 px-5 pb-5 pt-4">
                {GROUPS.map((g) => {
                  const v = d.by_group[g.key] || 0
                  const max = Math.max(...Object.values(d.by_group))
                  return (
                    <Link to={`/members?group=${g.key}`} key={g.key} className="group block">
                      <div className="mb-1 flex items-baseline justify-between text-sm">
                        <span className="font-semibold text-ink-700 group-hover:text-altar-700">{g.label}</span>
                        <span className="num font-semibold text-ink-900">{v}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                        <div className="h-full rounded-full bg-altar-500 transition-all group-hover:bg-altar-600" style={{ width: `${(v / max) * 100}%` }} />
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink-400">{g.rule}</div>
                    </Link>
                  )
                })}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader title="Home Church this week" subtitle={d.home_church.date ? `Thursday ${fmtDate(d.home_church.date)}` : 'No reports yet'} action={<Home className="h-5 w-5 text-ink-300" />} />
              <div className="grid grid-cols-3 gap-3 px-5 pt-4">
                {[
                  ['Adults', d.home_church.adults],
                  ['Children', d.home_church.children],
                  ['Visitors', d.home_church.visitors],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-linen p-3 text-center">
                    <div className="num text-xl font-semibold text-ink-900">{v}</div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{k}</div>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-500">Reports submitted</span>
                  <span className="num font-semibold">
                    {d.home_church.submitted} / {d.home_church.expected}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-ink-500">Cell offering</span>
                  <span className="num font-semibold">{money(d.home_church.offering)}</span>
                </div>
                {d.home_church.missing.length > 0 && (
                  <div className="mt-3 rounded-xl bg-flame-50 px-3 py-2 text-xs text-flame-800">
                    <span className="font-semibold">Waiting on:</span> {d.home_church.missing.join(', ')}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Spiritual growth" subtitle="This month" action={<Flame className="h-5 w-5 text-flame-500" />} />
              <div className="space-y-2 px-5 pb-5 pt-4">
                {[
                  { icon: Sparkles, label: 'New believers (born again)', v: d.new_believers_month, tone: 'bg-flame-50 text-flame-700' },
                  { icon: UserPlus, label: 'New members registered', v: d.new_members_month, tone: 'bg-altar-50 text-altar-600' },
                  { icon: Droplets, label: 'Saved, awaiting water baptism', v: d.awaiting_baptism, tone: 'bg-sky-50 text-sky-700', to: '/members?awaiting=baptism' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${r.tone}`}>
                      <r.icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-ink-700">{r.label}</span>
                    <span className="num text-lg font-semibold">{r.v}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="lg:col-span-2 xl:col-span-1">
              <CardHeader title={`Today · ${DAYS[TODAY.getDay()]}`} subtitle="Church programme" action={<Link to="/activities" className="text-xs font-semibold text-altar-600">Full calendar</Link>} />
              <div className="space-y-2 px-5 pb-5 pt-4">
                {todays.map((p) => (
                  <div key={p.title + p.time} className="flex items-center gap-3 rounded-xl bg-linen px-3 py-2.5">
                    <span className="h-8 w-1 rounded-full bg-altar-500" />
                    <div>
                      <div className="text-sm font-semibold">{p.title}</div>
                      <div className="text-xs text-ink-500">{p.time}</div>
                    </div>
                  </div>
                ))}
                {monthly.map((m) => (
                  <div key={m.title} className="flex items-center gap-3 rounded-xl border border-dashed border-flame-300 px-3 py-2.5">
                    <span className="h-8 w-1 rounded-full bg-flame-400" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{m.title}</div>
                      <div className="text-xs text-ink-500">
                        {format(m.date, 'EEE d MMM')} · {m.time}
                      </div>
                    </div>
                    <Badge tone="flame">{m.inDays === 0 ? 'Today' : `in ${m.inDays}d`}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {d.by_branch.length > 1 ? (
              <Card className="xl:col-span-2">
                <CardHeader title="Branches at a glance" subtitle={`Active members and ${thisMonth} tithe`} />
                <div className="overflow-x-auto px-2 pb-3 pt-2">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="th">Branch</th>
                        <th className="th text-right">Members</th>
                        <th className="th">Tithe · {format(TODAY, 'MMM')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.by_branch.map((b) => {
                        const max = Math.max(...d.by_branch.map((x) => x.tithe_month))
                        return (
                          <tr key={b.branch_id} className="border-t border-ink-100">
                            <td className="td font-semibold text-ink-900">{branchById(b.branch_id).name}</td>
                            <td className="td num text-right">{b.members}</td>
                            <td className="td w-1/2">
                              <div className="flex items-center gap-3">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                                  <div className="h-full rounded-full bg-altar-500" style={{ width: `${(b.tithe_month / max) * 100}%` }} />
                                </div>
                                <span className="num w-24 text-right text-sm font-semibold text-ink-900">{money(b.tithe_month)}</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card className="xl:col-span-2">
                <CardHeader title="Pledges — Main Church Building" subtitle={`${d.pledges.count} pledges in this branch`} />
                <div className="grid grid-cols-3 gap-3 p-5">
                  <div className="rounded-xl bg-linen p-3">
                    <div className="text-[11px] font-semibold uppercase text-ink-500">Pledged</div>
                    <div className="num mt-1 font-semibold">{money(d.pledges.pledged)}</div>
                  </div>
                  <div className="rounded-xl bg-linen p-3">
                    <div className="text-[11px] font-semibold uppercase text-ink-500">Paid</div>
                    <div className="num mt-1 font-semibold">{money(d.pledges.paid)}</div>
                  </div>
                  <div className="rounded-xl bg-linen p-3">
                    <div className="text-[11px] font-semibold uppercase text-ink-500">Overdue</div>
                    <div className="num mt-1 font-semibold text-scripture-700">{d.pledges.overdue}</div>
                  </div>
                </div>
              </Card>
            )}

            <Card>
              <CardHeader title="Birthdays this week" action={<Cake className="h-5 w-5 text-scripture-500" />} />
              <div className="px-5 pb-4 pt-3">
                {d.birthdays.length === 0 && <p className="py-3 text-sm text-ink-500">No birthdays in the next 7 days.</p>}
                <ul className="divide-y divide-ink-100">
                  {d.birthdays.slice(0, 6).map((b) => (
                    <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-medium">{b.name}</span>
                      <span className="text-xs text-ink-500">
                        {format(parseISO(b.dob), 'd MMM')} · turns {ageOf(b.dob) + 1}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {d.inventory_alerts.length > 0 && (
                <div className="border-t border-ink-100 px-5 py-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-scripture-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> Inventory alerts
                  </div>
                  {d.inventory_alerts.map((a) => (
                    <Link to="/inventory" key={a.id} className="flex items-center justify-between py-1 text-sm hover:text-altar-700">
                      <span>{a.name}</span>
                      <Badge tone={a.condition === 'Missing' ? 'red' : 'flame'}>{a.condition}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="grid lg:grid-cols-[1.4fr_1fr]">
              {IS_DEMO ? (
                <a href={SOCIAL.youtubeLive} target="_blank" rel="noreferrer" className="group relative grid aspect-video place-items-center overflow-hidden bg-altar-950">
                  <div className="absolute inset-0 bg-flame-glow opacity-70" />
                  <div className="relative flex flex-col items-center gap-3 text-white">
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-[#FF0033] shadow-lift transition group-hover:scale-105">
                      <YoutubeIcon className="h-8 w-8" />
                    </span>
                    <span className="text-sm font-semibold">Watch on YouTube</span>
                  </div>
                </a>
              ) : (
                <div className="aspect-video bg-altar-950">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/videoseries?list=${CHANNEL_UPLOADS}`}
                    title="Latest from Lord's Altar Ministries on YouTube"
                    loading="lazy"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              <div className="flex flex-col justify-center gap-4 p-6 lg:p-8">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-flame-600">Media</div>
                <h3 className="text-xl font-bold">Latest services on YouTube</h3>
                <p className="text-sm text-ink-500">Sunday Main Service, Discipleship and midweek services stream on the church channel. Share the links with members who missed a service.</p>
                <div className="flex flex-wrap gap-2">
                  <a href={SOCIAL.youtubeLive} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF0033] px-4 text-sm font-semibold text-white hover:opacity-90">
                    <YoutubeIcon className="h-4 w-4" /> Live & past streams
                  </a>
                  <a href={SOCIAL.facebook} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1877F2] px-4 text-sm font-semibold text-white hover:opacity-90">
                    <FacebookIcon className="h-4 w-4" /> Facebook page
                  </a>
                </div>
              </div>
            </div>
          </Card>

          {user.role === 'bishop' && !branch_id && (
            <p className="text-center text-xs text-ink-400">
              Showing {BRANCHES.length} branches. Use the branch selector at the top to focus on one. Groups: {GROUPS.map((g) => groupLabel(g.key)).join(' · ')}.
            </p>
          )}
          {user.role !== 'bishop' && (
            <p className="text-center text-xs text-ink-400">
              Showing <BranchTag id={user.branch_id} short={false} /> only.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
