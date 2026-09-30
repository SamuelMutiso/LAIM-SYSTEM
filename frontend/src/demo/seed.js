import { addDays, format, startOfMonth, nextSunday, isSunday, subWeeks, nextThursday, isThursday } from 'date-fns'
import { BRANCHES, DENOMINATIONS } from '../lib/constants'

function prng(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = prng(613)
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const int = (lo, hi) => Math.floor(rnd() * (hi - lo + 1)) + lo
const chance = (p) => rnd() < p
const iso = (d) => format(d, 'yyyy-MM-dd')

const TODAY = new Date(2026, 8, 29)

const MALE = ['John', 'Peter', 'James', 'Samuel', 'David', 'Joseph', 'Daniel', 'Stephen', 'Paul', 'Michael', 'Joshua', 'Brian', 'Kevin', 'Dennis', 'Collins', 'Victor', 'Emmanuel', 'Isaac', 'Moses', 'Patrick', 'George', 'Francis', 'Titus', 'Elijah', 'Caleb', 'Nathan', 'Simon', 'Benjamin']
const FEMALE = ['Mary', 'Grace', 'Faith', 'Esther', 'Ruth', 'Mercy', 'Joyce', 'Jane', 'Lucy', 'Ann', 'Caroline', 'Janet', 'Purity', 'Diana', 'Sharon', 'Eunice', 'Rose', 'Beatrice', 'Naomi', 'Lydia', 'Winnie', 'Rehema', 'Neema', 'Tabitha', 'Priscilla', 'Damaris', 'Hannah', 'Deborah']
const SURNAMES = ['Mutiso', 'Mwangi', 'Kilonzo', 'Musyoka', 'Mutua', 'Nzioka', 'Wambua', 'Kioko', 'Muthama', 'Ndunda', 'Kyalo', 'Mulwa', 'Nthenge', 'Kamau', 'Otieno', 'Sankale', 'Parsimei', 'Koikai', 'Leshan', 'Njoroge', 'Kimani', 'Kariuki', 'Mbithi', 'Munyao', 'Nzomo', 'Kitheka', 'Saitoti', 'Nkoitoi']

const AREAS = {
  1: ['Acacia', 'Kitengela', 'Isinya', 'Oloosirkon', 'Kajiado Road'],
  2: ['Korrompoi', 'Oloosuyian', 'Enkasiti'],
  3: ['Milimani', 'Kajiado Town', 'Township'],
  4: ['Matuu Town', 'Yatta', 'Kithimani'],
}

export const cells = [
  [1, 'Acacia', 'Acacia'],
  [1, 'Baraka', 'Kitengela'],
  [1, 'Neema', 'Isinya'],
  [1, 'Upendo', 'Oloosirkon'],
  [1, 'Imani', 'Kajiado Road'],
  [2, 'Tumaini', 'Korrompoi'],
  [2, 'Amani', 'Oloosuyian'],
  [3, 'Shalom', 'Milimani'],
  [3, 'Bethel', 'Township'],
  [4, 'Rehoboth', 'Matuu Town'],
  [4, 'Zion', 'Kithimani'],
].map(([branch_id, name, area], i) => ({ id: i + 1, branch_id, name, area, venue: '', meeting_time: '6:00 PM', leader_member_id: null, assistant_member_id: null }))

const phone = () => `07${pick(['0', '1', '2', '9'])}${int(1000000, 9999999)}`.slice(0, 10)
const email = (f, l) => `${f}.${l}${int(1, 99)}@gmail.com`.toLowerCase()
const mpesaCode = () => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  let s = 'U'
  for (let i = 0; i < 9; i++) s += A[Math.floor(rnd() * A.length)]
  return s
}
const bankRef = () => `FT26${int(100, 365)}${int(10000, 99999)}`

export const members = []
const usedNames = new Set()
let mid = 1
function addMember(branch_id, opts) {
  const gender = opts.gender ?? (chance(0.55) ? 'F' : 'M')
  let first = opts.first ?? pick(gender === 'F' ? FEMALE : MALE)
  let last = opts.last ?? pick(SURNAMES)
  for (let tries = 0; !opts.first && usedNames.has(`${first} ${last}`) && tries < 40; tries++) {
    first = pick(gender === 'F' ? FEMALE : MALE)
    last = pick(SURNAMES)
  }
  usedNames.add(`${first} ${last}`)
  const age = opts.age
  const dob = addDays(new Date(TODAY.getFullYear() - age, int(0, 11), int(1, 28)), 0)
  const branchCells = cells.filter((c) => c.branch_id === branch_id)
  const m = {
    id: mid++,
    first_name: first,
    last_name: last,
    full_name: `${first} ${last}`,
    gender,
    dob: iso(dob),
    phone: age >= 16 ? phone() : '',
    email: age >= 18 && chance(0.6) ? email(first, last) : '',
    residence: pick(AREAS[branch_id]),
    marital_status: opts.marital ?? 'Single',
    single_parent: opts.single_parent ?? false,
    branch_id,
    home_church_id: pick(branchCells).id,
    membership_status: chance(0.93) ? 'Active' : 'Inactive',
    joined_on: iso(addDays(TODAY, -int(60, 3650))),
    salvation_date: age >= 10 && chance(0.85) ? iso(addDays(TODAY, -int(30, 4000))) : null,
    water_baptism_date: age >= 12 && chance(0.7) ? iso(addDays(TODAY, -int(20, 3500))) : null,
    holy_spirit_baptism: age >= 12 && chance(0.6),
    dedication_date: age <= 12 && chance(0.7) ? iso(addDays(dob, int(30, 300))) : null,
    occupation: age >= 22 ? pick(['Teacher', 'Farmer', 'Business', 'Nurse', 'Driver', 'Mechanic', 'Accountant', 'Student', 'Tailor', 'Civil servant', 'Engineer', '']) : age >= 18 ? 'Student' : '',
    notes: '',
    ...opts.extra,
  }
  members.push(m)
  return m
}

addMember(1, { first: 'Donald', last: 'Mutiso', gender: 'M', age: 62, marital: 'Married', extra: { title: 'Bishop Dr.' } })

const SIZES = { 1: 104, 2: 44, 3: 38, 4: 47 }
for (const b of BRANCHES) {
  const target = SIZES[b.id] - (b.id === 1 ? 1 : 0)
  for (let i = 0; i < target; i++) {
    const r = rnd()
    let age
    if (r < 0.2) age = int(1, 12)
    else if (r < 0.33) age = int(13, 19)
    else if (r < 0.46) age = int(20, 24)
    else if (r < 0.6) age = int(25, 38)
    else age = int(30, 72)
    let marital = 'Single'
    let single_parent = false
    if (age >= 26 && chance(age > 35 ? 0.8 : 0.45)) marital = age > 60 && chance(0.25) ? 'Widowed' : 'Married'
    else if (age >= 22 && chance(0.1)) single_parent = true
    addMember(b.id, { age, marital, single_parent })
  }
}

export const findMember = (id) => members.find((m) => m.id === id)

members
  .filter((m) => TODAY.getFullYear() - Number(m.dob.slice(0, 4)) >= 14)
  .filter((_, i) => i % 23 === 5)
  .slice(0, 7)
  .forEach((m, i) => {
    m.salvation_date = iso(addDays(TODAY, -int(1, 27)))
    m.water_baptism_date = null
    if (i < 4) m.joined_on = m.salvation_date
  })

cells.forEach((c) => {
  const adults = members.filter((m) => m.id !== 1 && m.branch_id === c.branch_id && m.home_church_id === c.id && TODAY.getFullYear() - Number(m.dob.slice(0, 4)) >= 28)
  const pool = adults.length ? adults : members.filter((m) => m.branch_id === c.branch_id)
  c.leader_member_id = pool[0]?.id ?? null
  c.assistant_member_id = pool[1]?.id ?? null
  c.venue = `${pool[0]?.last_name ?? 'Member'}'s home`
})

const firstSunday = (y, m) => {
  const s = startOfMonth(new Date(y, m, 1))
  return isSunday(s) ? s : nextSunday(s)
}
export const tithes = []
let tid = 1
const tithers = members.filter((m) => TODAY.getFullYear() - Number(m.dob.slice(0, 4)) >= 20 && chance(0.62))
tithers.forEach((m) => {
  const base = pick([200, 300, 500, 500, 800, 1000, 1000, 1500, 2000, 2500, 3000, 5000, 7500])
  const since = Math.max(0, int(-3, 3))
  for (let mo = since; mo <= 8; mo++) {
    if (!chance(0.86)) continue
    const method = rnd() < 0.62 ? 'mpesa' : rnd() < 0.3 ? 'bank' : 'cash'
    tithes.push({
      id: tid++,
      member_id: m.id,
      branch_id: m.branch_id,
      date: iso(firstSunday(2026, mo)),
      amount: Math.round((base * (0.85 + rnd() * 0.4)) / 50) * 50,
      method,
      reference: method === 'mpesa' ? mpesaCode() : method === 'bank' ? bankRef() : '',
      recorded_by: 'secretary',
    })
  }
})

export const offerings = []
let oid = 1
const scale = { 1: 1, 2: 0.42, 3: 0.36, 4: 0.44 }
for (let d = nextSunday(new Date(2026, 0, 1)); d <= TODAY; d = addDays(d, 7)) {
  for (const b of BRANCHES) {
    const s = scale[b.id] * (0.8 + rnd() * 0.45)
    const counts = {}
    DENOMINATIONS.forEach((den) => {
      const base = { 1000: 3, 500: 5, 200: 8, 100: 20, 50: 24, 20: 34, 10: 30, 5: 12, 1: 5 }[den.value]
      counts[den.value] = Math.max(0, Math.round(base * s * (0.7 + rnd() * 0.6)))
    })
    const cash_total = DENOMINATIONS.reduce((t, den) => t + den.value * counts[den.value], 0)
    const mpesa_total = Math.round((cash_total * (0.25 + rnd() * 0.3)) / 10) * 10
    const bank_total = chance(0.2) ? int(1, 5) * 1000 : 0
    offerings.push({
      id: oid++,
      branch_id: b.id,
      date: iso(d),
      service: 'Main Service',
      counts,
      cash_total,
      mpesa_total,
      bank_total,
      total: cash_total + mpesa_total + bank_total,
      counted_by: pick(['Treasurer & Secretary', 'Ushers team', 'Finance committee']),
      notes: '',
    })
  }
}

export const pledges = []
export const pledgePayments = []
let pid = 1
let ppid = 1
const adults = members.filter((m) => TODAY.getFullYear() - Number(m.dob.slice(0, 4)) >= 22)
const pledgers = [...adults].sort(() => rnd() - 0.5).slice(0, 38)

const samuel = addMember(1, { first: 'Samuel', last: 'Mutiso', gender: 'M', age: 41, marital: 'Married' })
pledgers.unshift(samuel)
pledgers.forEach((m, i) => {
  const amount = i === 0 ? 5000 : pick([2000, 5000, 5000, 10000, 10000, 15000, 20000, 25000, 50000, 100000])
  const pledged_on = addDays(new Date(2026, 0, 11), int(0, 150))
  const due = i === 0 ? new Date(2026, 11, 31) : addDays(pledged_on, pick([90, 120, 180, 270, 365]))
  const p = { id: pid++, member_id: m.id, branch_id: m.branch_id, project: 'Main Church Building', amount, pledged_on: iso(pledged_on), due_date: iso(due), notes: '' }
  pledges.push(p)
  let paid = 0
  const targetPaid = i === 0 ? 3000 : Math.round((amount * pick([0, 0.2, 0.4, 0.5, 0.6, 0.8, 1, 1, 1])) / 100) * 100
  let d = addDays(pledged_on, int(7, 30))
  while (paid < targetPaid && d <= TODAY) {
    const amt = Math.min(targetPaid - paid, i === 0 ? (paid === 0 ? 2000 : 1000) : Math.max(500, Math.round((amount * pick([0.2, 0.25, 0.5])) / 100) * 100))
    const method = rnd() < 0.65 ? 'mpesa' : rnd() < 0.5 ? 'bank' : 'cash'
    pledgePayments.push({ id: ppid++, pledge_id: p.id, date: iso(d), amount: amt, method, reference: method === 'mpesa' ? mpesaCode() : method === 'bank' ? bankRef() : '' })
    paid += amt
    d = addDays(d, int(20, 60))
  }
})

export const buildingFund = {
  project: 'Main Church Building',
  target: 12_000_000,
  target_is_sample: true,
  contributions: [],
}
let bid = 1
for (let d = new Date(2026, 0, 18); d <= TODAY; d = addDays(d, int(5, 14))) {
  const anon = chance(0.35)
  const m = pick(adults)
  const method = rnd() < 0.6 ? 'mpesa' : rnd() < 0.5 ? 'bank' : 'cash'
  buildingFund.contributions.push({
    id: bid++,
    date: iso(d),
    member_id: anon ? null : m.id,
    contributor: anon ? pick(['Harambee — Youth Department', 'Well-wisher', 'Anonymous', "Women's Fellowship", "Men's Fellowship"]) : m.full_name,
    branch_id: anon ? 1 : m.branch_id,
    amount: pick([1000, 2000, 5000, 10000, 20000, 50000, 150000]),
    method,
    reference: method === 'mpesa' ? mpesaCode() : method === 'bank' ? bankRef() : '',
  })
}

export const cellReports = []
let crid = 1
let thu = isThursday(TODAY) ? TODAY : subWeeks(nextThursday(TODAY), 1)
const SCRIPTURES = ['John 15:1-8', 'Romans 12:1-2', 'Psalm 23', 'Acts 2:42-47', 'Hebrews 10:24-25', 'Matthew 6:25-34', 'Philippians 4:4-9', 'James 1:2-8', 'Isaiah 40:28-31', 'Joshua 1:6-9', '1 Corinthians 13', 'Galatians 5:22-26']
for (let w = 0; w < 12; w++) {
  const d = subWeeks(thu, w)
  cells.forEach((c) => {
    if (w === 0 && chance(0.35)) return
    const cm = members.filter((m) => m.home_church_id === c.id && m.membership_status === 'Active')
    const adultsIn = cm.filter((m) => TODAY.getFullYear() - Number(m.dob.slice(0, 4)) >= 13 && chance(0.72))
    const kids = cm.filter((m) => {
      const a = TODAY.getFullYear() - Number(m.dob.slice(0, 4))
      return a > 3 && a < 13 && chance(0.7)
    })
    const leader = findMember(c.leader_member_id)
    const asst = findMember(c.assistant_member_id)
    cellReports.push({
      id: crid++,
      cell_id: c.id,
      branch_id: c.branch_id,
      date: iso(d),
      area: c.area,
      venue: c.venue,
      time: '6:00 PM',
      leader: leader?.full_name ?? '',
      assistant: asst?.full_name ?? '',
      preaching_from: SCRIPTURES[(w + c.id) % SCRIPTURES.length],
      preacher: pick([leader?.full_name, asst?.full_name, 'Pastor'].filter(Boolean)),
      worship_leader: pick(cm)?.full_name ?? '',
      adults: adultsIn.map((m) => m.full_name),
      children: kids.map((m) => m.full_name),
      visitors: int(0, 4),
      offering: int(3, 25) * 50,
      signed_by: leader?.full_name ?? '',
      submitted_at: `${iso(d)}T19:${String(int(5, 55)).padStart(2, '0')}:00`,
    })
  })
}

const person = (branch_id, gender) => {
  const pool = members.filter((m) => m.branch_id === branch_id && (!gender || m.gender === gender) && TODAY.getFullYear() - Number(m.dob.slice(0, 4)) >= 28)
  return pick(pool)
}
const L = (role, member, branch_id, scope = 'branch', since = '2023-01-15', group = 'Leadership') => ({
  role,
  member_id: member.id,
  name: member.full_name,
  phone: member.phone,
  email: member.email,
  branch_id,
  scope,
  since,
  group,
  active: true,
})
export const leaders = []
let lid = 1
const pushL = (o) => leaders.push({ id: lid++, ...o })
pushL({ ...L('Bishop', members[0], 1, 'church', '2008-03-02'), name: 'Bishop Dr. Donald Mutiso' })
pushL(L('Assistant Bishop', person(1, 'M'), 1, 'church', '2016-06-05'))
pushL(L('Senior Pastor — HQ', person(1), 1))
pushL(L('Pastor — Korrompoi', person(2), 2))
pushL(L('Pastor — Milimani', person(3), 3))
pushL(L('Pastor — Matuu', person(4), 4))
pushL(L('Youth Pastor', person(1), 1, 'church', '2022-02-06'))
pushL(L('Sunday School Leader', person(1, 'F'), 1, 'church', '2021-09-05'))
pushL(L('Worship Leader', person(1), 1, 'church', '2024-01-07', 'Worship'))
pushL(L('Head of Media Team', person(1, 'M'), 1, 'church', '2023-05-14', 'Media'))
pushL(L("Women's Fellowship Leader", person(1, 'F'), 1, 'church'))
pushL(L("Men's Fellowship Leader", person(1, 'M'), 1, 'church'))
pushL(L('Head Usher', person(1), 1, 'branch'))
pushL(L('Church Treasurer', person(1), 1, 'church'))
;[1, 2, 3, 4].forEach((b) => pushL(L('Branch Secretary', person(b, 'F'), b, 'branch', '2024-02-04', 'Office')))

pushL({ ...L('Worship Leader', person(1), 1, 'church', '2019-01-06', 'Worship'), active: false, until: '2023-12-31' })

export const worshipTeam = [
  ['Worship Leader', 'Lead vocals'],
  ['Keyboardist', 'Keyboard'],
  ['Lead Guitarist', 'Lead guitar'],
  ['Bass Guitarist', 'Bass guitar'],
  ['Drummer', 'Drums'],
  ['Vocalist', 'Soprano'],
  ['Vocalist', 'Alto'],
  ['Vocalist', 'Tenor'],
  ['Sound Engineer', 'Mixer & sound'],
].map(([role, part], i) => {
  const m = i === 0 ? findMember(leaders.find((l) => l.role === 'Worship Leader' && l.active).member_id) : person(1)
  return { id: i + 1, member_id: m.id, name: m.full_name, phone: m.phone, role, part, branch_id: 1 }
})

const INV = [
  [1, 'Keyboards & Pianos', 'Yamaha PSR-SX700 Keyboard', 'Yamaha', 1, 'Good'],
  [1, 'Keyboards & Pianos', 'Roland RD-88 Stage Piano', 'Roland', 1, 'Excellent'],
  [1, 'Guitars', 'Lead Guitar (Electric)', 'Ibanez', 1, 'Good'],
  [1, 'Guitars', 'Bass Guitar (4-string)', 'Yamaha', 1, 'Good'],
  [1, 'Guitars', 'Acoustic Guitar', 'Fender', 1, 'Fair'],
  [1, 'Drums & Percussion', 'Drum Set (5-piece)', 'Pearl', 1, 'Good'],
  [1, 'Drums & Percussion', 'Congas (pair)', 'LP', 1, 'Good'],
  [1, 'Microphones', 'Wired Vocal Mic SM58', 'Shure', 6, 'Good'],
  [1, 'Microphones', 'Wireless Handheld Mic BLX24', 'Shure', 4, 'Good'],
  [1, 'Microphones', 'Headset Mic (Pulpit)', 'Sennheiser', 1, 'Missing'],
  [1, 'Speakers', 'Main Speaker EON715', 'JBL', 4, 'Good'],
  [1, 'Speakers', 'Stage Monitor', 'Behringer', 2, 'Fair'],
  [1, 'Speakers', 'Subwoofer 18"', 'Yamaha', 2, 'Good'],
  [1, 'Mixers', '16-Channel Mixer MG16XU', 'Yamaha', 1, 'Good'],
  [1, 'Amplifiers', 'Power Amplifier XLS 1502', 'Crown', 2, 'Good'],
  [1, 'Amplifiers', 'Bass Amplifier', 'Hartke', 1, 'Needs repair'],
  [1, 'Stands', 'Mic Stands (boom)', 'K&M', 10, 'Good'],
  [1, 'Stands', 'Keyboard Stand (double)', 'Generic', 2, 'Good'],
  [1, 'Stands', 'Speaker Stands', 'Generic', 4, 'Good'],
  [1, 'Media & Projection', 'Projector', 'Epson', 1, 'Good'],
  [1, 'Media & Projection', 'Live-stream Camera', 'Canon', 1, 'Good'],
  [1, 'Cables & Accessories', 'XLR Cables (10m)', 'Generic', 16, 'Fair'],
  [2, 'Keyboards & Pianos', 'Casio CT-X5000 Keyboard', 'Casio', 1, 'Good'],
  [2, 'Microphones', 'Wired Vocal Mic', 'Shure', 3, 'Good'],
  [2, 'Speakers', 'Active Speaker', 'Yamaha', 2, 'Good'],
  [2, 'Mixers', '8-Channel Mixer', 'Behringer', 1, 'Fair'],
  [2, 'Drums & Percussion', 'Drum Set (4-piece)', 'Mapex', 1, 'Fair'],
  [3, 'Keyboards & Pianos', 'Yamaha PSR-E473 Keyboard', 'Yamaha', 1, 'Excellent'],
  [3, 'Microphones', 'Wireless Mic', 'Shure', 2, 'Good'],
  [3, 'Speakers', 'Active Speaker', 'JBL', 2, 'Good'],
  [3, 'Stands', 'Mic Stands', 'Generic', 4, 'Good'],
  [4, 'Keyboards & Pianos', 'Korg Keyboard', 'Korg', 1, 'Good'],
  [4, 'Guitars', 'Bass Guitar', 'Yamaha', 1, 'Good'],
  [4, 'Microphones', 'Wired Vocal Mic', 'Shure', 4, 'Good'],
  [4, 'Amplifiers', 'Power Amplifier', 'Crown', 1, 'Good'],
  [4, 'Speakers', 'Passive Speaker', 'Yamaha', 2, 'Fair'],
]
export const inventory = INV.map(([branch_id, category, name, brand, quantity, condition], i) => {
  const custodian = pick(members.filter((m) => m.branch_id === branch_id && TODAY.getFullYear() - Number(m.dob.slice(0, 4)) >= 22))
  return {
    id: i + 1,
    branch_id,
    category,
    name,
    brand,
    model: '',
    serial_no: chance(0.5) ? `SN${int(100000, 999999)}` : '',
    quantity,
    condition,
    location: pick(['Main sanctuary', 'Store room', 'Media booth', 'Stage']),
    custodian_member_id: custodian.id,
    custodian: custodian.full_name,
    acquired_on: iso(addDays(TODAY, -int(120, 2500))),
    notes: condition === 'Missing' ? 'Not found at last stock-take. Last used at Sunday Main Service.' : '',
    last_checked: iso(subWeeks(TODAY, int(1, 6))),
  }
})

export const stockTakes = []
let stid = 1
inventory.forEach((it) => {
  const monthsBack = [3, 2, 1]
  monthsBack.forEach((monthsAgo, k) => {
    const d = addDays(TODAY, -30 * monthsAgo - int(0, 6))
    const last = k === 2
    stockTakes.push({
      id: stid++,
      item_id: it.id,
      date: iso(last ? new Date(it.last_checked) : d),
      counted: last && it.condition === 'Missing' ? 0 : it.quantity,
      expected: it.quantity,
      condition: last ? it.condition : it.condition === 'Missing' ? 'Good' : it.condition,
      checked_by: 'Branch Secretary',
      note: last && it.condition === 'Missing' ? 'Item not found' : '',
    })
  })
})

export const audit = [
  { id: 1, at: '2026-09-28T13:12:00', user: 'Secretary (HQ)', action: 'Recorded Sunday offering', target: '27 Sep 2026 · LAIM HQ' },
  { id: 2, at: '2026-09-28T12:40:00', user: 'Secretary (Matuu)', action: 'Added member', target: 'New member registration' },
  { id: 3, at: '2026-09-25T19:32:00', user: 'Cell Leader (Acacia)', action: 'Submitted Home Church report', target: 'Acacia · 24 Sep 2026' },
  { id: 4, at: '2026-09-21T11:05:00', user: 'Secretary (HQ)', action: 'Recorded pledge payment', target: 'Samuel Mutiso · KSh 1,000' },
  { id: 5, at: '2026-09-15T09:22:00', user: 'Secretary (HQ)', action: 'Stock-take', target: 'Headset Mic (Pulpit) marked Missing' },
  { id: 6, at: '2026-09-06T14:02:00', user: 'Secretary (Korrompoi)', action: 'Recorded tithe', target: '14 entries · 6 Sep 2026' },
]
