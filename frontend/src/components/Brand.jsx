import { asset, cx } from '../lib/utils'

export function LogoMark({ className }) {
  return <img src={asset('brand/mark.png')} alt="Lord's Altar Ministries International" className={cx('object-contain', className)} draggable={false} />
}

export function LogoFull({ className }) {
  return <img src={asset('brand/logo.png')} alt="Lord's Altar Ministries International — Leviticus 6:13" className={cx('object-contain', className)} draggable={false} />
}

export function Wordmark({ light, compact }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cx('grid shrink-0 place-items-center rounded-2xl bg-white p-1.5 shadow-sm', compact ? 'h-10 w-10' : 'h-12 w-12')}>
        <LogoMark className="h-full w-full" />
      </span>
      <div className="leading-tight">
        <div className={cx('font-display text-[15px] font-bold tracking-tight', light ? 'text-white' : 'text-ink-900')}>Lord&rsquo;s Altar</div>
        <div className={cx('text-[10px] font-semibold uppercase tracking-[0.16em]', light ? 'text-flame-300' : 'text-scripture-600')}>Ministries International</div>
      </div>
    </div>
  )
}

export function YoutubeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
    </svg>
  )
}

export function FacebookIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  )
}
