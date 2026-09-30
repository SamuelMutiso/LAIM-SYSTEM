import { ScrollText } from 'lucide-react'
import { Audit as Api } from '../api/services'
import { useApi } from '../app/hooks'
import { Card, Empty, Loading, PageHeader } from '../components/ui'
import { fmtDate } from '../lib/utils'

export default function Audit() {
  const { data, loading, error } = useApi(() => Api.list(), [])
  return (
    <div>
      <PageHeader eyebrow="Church" title="Audit log" subtitle="Every record entered or changed, by whom and when. Only the Bishop can see this page." />
      <Card>
        {loading ? (
          <Loading />
        ) : error ? (
          <Empty icon={ScrollText} title={error} />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[640px]">
              <thead className="bg-linen/60">
                <tr>
                  <th className="th">When</th>
                  <th className="th">Who</th>
                  <th className="th">What</th>
                  <th className="th">Details</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.id} className="border-t border-ink-100">
                    <td className="td whitespace-nowrap">{fmtDate(a.at, 'd MMM yyyy, HH:mm')}</td>
                    <td className="td font-semibold text-ink-900">{a.user}</td>
                    <td className="td">{a.action}</td>
                    <td className="td text-ink-500">{a.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
