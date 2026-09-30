import { Input } from './ui'
import { cx } from '../lib/utils'

export function PeriodPicker({ value, onChange, custom, onCustom }) {
  const opts = [
    ['month', 'This month'],
    ['last_month', 'Last month'],
    ['3m', '3 months'],
    ['year', 'This year'],
    ['all', 'All time'],
    ['custom', 'Custom'],
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-x-auto rounded-xl border border-ink-200 bg-white p-0.5 scrollbar-thin">
        {opts.map(([k, l]) => (
          <button key={k} onClick={() => onChange(k)} className={cx('whitespace-nowrap rounded-[10px] px-3 py-1.5 text-xs font-semibold transition', value === k ? 'bg-altar-600 text-white' : 'text-ink-500 hover:text-ink-900')}>
            {l}
          </button>
        ))}
      </div>
      {value === 'custom' && (
        <div className="flex items-center gap-2">
          <Input type="date" className="h-9 w-40 py-1.5" value={custom.from} onChange={(e) => onCustom({ ...custom, from: e.target.value })} />
          <span className="text-ink-400">to</span>
          <Input type="date" className="h-9 w-40 py-1.5" value={custom.to} onChange={(e) => onCustom({ ...custom, to: e.target.value })} />
        </div>
      )}
    </div>
  )
}
