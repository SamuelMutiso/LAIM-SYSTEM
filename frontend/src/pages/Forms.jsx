import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Download, ExternalLink, FileText, Printer } from 'lucide-react'
import { Button, Card, PageHeader } from '../components/ui'
import { asset } from '../lib/utils'

const FORMS = [
  { slug: 'home-church-report', title: 'Home Church Report', desc: 'Thursday cell report — attendance, preaching, visitors and offering.', online: '/home-church', pages: 1 },
  { slug: 'new-member-registration', title: 'New Member Registration', desc: 'Personal details, contacts, family, home church and spiritual background.', pages: 1 },
  { slug: 'member-details-sheet', title: 'Member Details Sheet', desc: 'One line per person — name, phone, date of birth, marital status, area and home church. For collecting details at the church door.', pages: 1 },
  { slug: 'new-believer-decision', title: 'New Believer / Salvation Decision', desc: 'For someone who has just given their life to Christ — follow-up details.', pages: 1 },
  { slug: 'water-baptism-application', title: 'Water Baptism Application', desc: 'Candidate details, salvation testimony and pastor’s approval.', pages: 1 },
  { slug: 'child-dedication-request', title: 'Child Dedication Request', desc: 'Child and parents’ details for dedication on a Sunday service.', pages: 1 },
  { slug: 'marriage-application', title: 'Marriage / Wedding Application', desc: 'Couple details, counselling sessions and wedding date request.', pages: 1 },
  { slug: 'membership-transfer-letter', title: 'Membership Transfer Letter', desc: 'Letter of transfer to or from another branch or church.', pages: 1 },
  { slug: 'visitor-card', title: 'Visitor Card', desc: 'Quick card for first-time visitors — two per page, cut in half.', pages: 1 },
]

export default function Forms() {
  const user = useSelector((s) => s.auth.user)
  return (
    <div>
      <PageHeader eyebrow="Church" title="Forms" subtitle="Download and print only what you need — no more printing in bulk for every home church." />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {FORMS.map((f) => (
          <Card key={f.slug} className="group flex flex-col overflow-hidden">
            <a href={asset(`forms/${f.slug}.pdf`)} target="_blank" rel="noreferrer" className="relative block aspect-[1/1.18] overflow-hidden border-b border-ink-100 bg-linen">
              <img src={asset(`forms/thumbs/${f.slug}.png`)} alt={`${f.title} preview`} loading="lazy" className="absolute inset-x-6 top-6 w-[calc(100%-3rem)] rounded-md bg-white shadow-lift transition duration-300 group-hover:-translate-y-1 group-hover:rotate-[-0.5deg]" />
            </a>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-scripture-600" />
                <h3 className="font-display font-semibold leading-snug">{f.title}</h3>
              </div>
              <p className="mt-1.5 flex-1 text-sm text-ink-500">{f.desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={asset(`forms/${f.slug}.pdf`)} download className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-altar-600 px-3 text-xs font-semibold text-white hover:bg-altar-700">
                  <Download className="h-3.5 w-3.5" /> PDF
                </a>
                <a href={asset(`forms/${f.slug}.pdf`)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-ink-200 px-3 text-xs font-semibold text-ink-700 hover:bg-ink-100/50">
                  <Printer className="h-3.5 w-3.5" /> Open & print
                </a>
                {f.online && user.role !== 'dept_leader' && (
                  <Link to={f.online}>
                    <Button size="sm" variant="gold" icon={ExternalLink}>
                      {user.role === 'cell_leader' ? 'Fill online' : 'Online reports'}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
