export const BRANCHES = [
  { id: 1, code: 'LAIM', name: 'LAIM Headquarters', short: 'HQ', color: '#3B40B0' },
  { id: 2, code: 'KOR', name: "Lord's Altar Korrompoi", short: 'Korrompoi', color: '#C78A10' },
  { id: 3, code: 'MIL', name: "Lord's Altar Milimani", short: 'Milimani', color: '#A5446A' },
  { id: 4, code: 'MAT', name: "Lord's Altar Matuu", short: 'Matuu', color: '#5AA9D6' },
  { id: 5, code: 'NKP', name: "Lord's Altar Noonkopir", short: 'Noonkopir', color: '#2E9C6A' },
]

export const branchById = (id) => BRANCHES.find((b) => b.id === Number(id))

export const ROLES = {
  bishop: { label: 'Bishop', scope: 'All branches · view everything' },
  pastor: { label: 'Branch Pastor', scope: 'Own branch · view only' },
  secretary: { label: 'Branch Secretary', scope: 'Own branch · enter & edit data' },
  cell_leader: { label: 'Home Church Leader', scope: 'Own cell · Thursday reports' },
}

export const GROUPS = [
  { key: 'sunday_school', label: 'Sunday School', rule: '0–12 years' },
  { key: 'teens', label: 'Teenagers', rule: '13–19 years' },
  { key: 'junior_youth', label: 'Junior Youth', rule: '20–24 years' },
  { key: 'senior_youth', label: 'Senior Youth', rule: '25–35, and unmarried over 35' },
  { key: 'fathers', label: 'Fathers', rule: 'Married men & single fathers' },
  { key: 'mothers', label: 'Mothers', rule: 'Married women & single mothers' },
]

export const groupLabel = (key) => GROUPS.find((g) => g.key === key)?.label ?? '—'

export const MARITAL = ['Single', 'Married', 'Widowed', 'Divorced', 'Separated']

export const PAYMENT_METHODS = [
  { key: 'mpesa', label: 'M-Pesa', refLabel: 'M-Pesa code' },
  { key: 'bank', label: 'Bank', refLabel: 'Bank reference' },
  { key: 'cash', label: 'Cash', refLabel: null },
]

export const DENOMINATIONS = [
  { value: 1000, kind: 'note' },
  { value: 500, kind: 'note' },
  { value: 200, kind: 'note' },
  { value: 100, kind: 'note' },
  { value: 50, kind: 'note' },
  { value: 20, kind: 'coin' },
  { value: 10, kind: 'coin' },
  { value: 5, kind: 'coin' },
  { value: 1, kind: 'coin' },
]

export const INVENTORY_CATEGORIES = [
  'Keyboards & Pianos',
  'Guitars',
  'Drums & Percussion',
  'Microphones',
  'Speakers',
  'Mixers',
  'Amplifiers',
  'Stands',
  'Cables & Accessories',
  'Media & Projection',
  'Furniture',
]

export const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Needs repair', 'Missing']

export const PLEDGE_PROJECTS = ['Main Church Building']

export const WEEKLY_PROGRAMME = [
  { day: 0, time: '6:00 – 7:00 AM', title: 'Morning Glory', kind: 'prayer' },
  { day: 0, time: '7:00 – 8:00 AM', title: 'Youth Service', kind: 'youth' },
  { day: 0, time: '8:00 – 9:30 AM', title: 'Discipleship Class', kind: 'teaching' },
  { day: 0, time: '9:30 AM – 12:00 PM', title: 'Main Service', kind: 'service' },
  { day: 1, time: '5:00 – 6:00 AM', title: 'Morning Glory', kind: 'prayer' },
  { day: 2, time: '5:00 – 6:00 AM', title: 'Morning Glory', kind: 'prayer' },
  { day: 2, time: '5:30 – 7:30 PM', title: 'Evening Prayer Service', kind: 'prayer' },
  { day: 3, time: '5:00 – 6:00 AM', title: 'Morning Glory', kind: 'prayer' },
  { day: 3, time: '5:30 – 7:30 PM', title: 'Bible Study', kind: 'teaching' },
  { day: 4, time: '5:00 – 6:00 AM', title: 'Morning Glory', kind: 'prayer' },
  { day: 4, time: '6:00 – 7:00 PM', title: 'Home Church', kind: 'cell' },
  { day: 5, time: '5:00 – 6:00 AM', title: 'Morning Glory', kind: 'prayer' },
  { day: 5, time: '9:00 PM – Dawn', title: 'Overnight Kesha', kind: 'prayer' },
  { day: 6, time: 'From 5:30 PM', title: 'Praise & Worship Practice', kind: 'worship' },
]

export const MONTHLY_EVENTS = [
  { rule: 'first-friday', title: "Leaders' Kesha", time: 'Overnight', note: 'First Friday of every month' },
  { rule: 'last-monday', title: 'Youth Kesha', time: '7:00 – 9:00 PM', note: 'Last Monday of every month' },
]

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const SOCIAL = {
  youtube: 'https://www.youtube.com/@lordsaltar',
  youtubeLive: 'https://www.youtube.com/@lordsaltar/streams',
  facebook: 'https://www.facebook.com/share/1CRMsJrLJM/',
}
