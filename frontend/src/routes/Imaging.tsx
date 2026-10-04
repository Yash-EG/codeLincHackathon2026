import { useShallow } from 'zustand/react/shallow'
import EducationChat from '../components/EducationChat'
import Panel from '../components/Panel'
import RoomGate from '../components/RoomGate'
import RoomIntro from '../components/RoomIntro'
import { table } from '../components/ui'
import { PROCEDURES } from '../data/mockData'
import { COVERAGE_LABEL } from '../lib/estimate'
import { ROOMS_BY_ID } from '../rooms'
import { useSessionStore } from '../store/sessionStore'
import type { CoverageClass } from '../types/domain'

const room = ROOMS_BY_ID.imaging

const EXAMPLES: Record<CoverageClass, string> = {
  PREVENTIVE: 'Cleanings, exams, X-rays',
  BASIC: 'Fillings, root canals, simple extractions',
  MAJOR: 'Crowns, implants, night guards',
  ORTHODONTIC: 'Braces and aligners',
}

const CLASSES: CoverageClass[] = ['PREVENTIVE', 'BASIC', 'MAJOR', 'ORTHODONTIC']
const LIMITED = Object.values(PROCEDURES).filter((p) => p.frequencyPerYear)

export default function Imaging() {
  return (
    <>
      <RoomIntro room={room} />
      <Panel id="ask" eyebrow="Glossary" title="Ask about your benefits">
        <EducationChat />
      </Panel>
      <RoomGate prerequisite="plan">
        <Coverage />
      </RoomGate>
    </>
  )
}

function Coverage() {
  const { plan, tiers, claims, translations } = useSessionStore(
    useShallow((s) => ({ plan: s.plan, tiers: s.tiers, claims: s.claims, translations: s.translations })),
  )
  if (!plan || !tiers) return null

  return (
    <>
      <Panel id="coverage" title="What each kind of care is covered at">
        <p>
          Insurance pays a share of each bill. The share depends on the kind of care and on whether your dentist is in
          the plan&rsquo;s network.
        </p>
        <div className={table.frame}>
          <table className={table.root}>
            <caption className={table.caption}>{plan.planName}: share insurance pays</caption>
            <thead className={table.head}>
              <tr>
                <th scope="col" className={table.th}>
                  Kind of care
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  In-network
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  Out-of-network
                </th>
                <th scope="col" className={table.th}>
                  Deductible first?
                </th>
                <th scope="col" className={table.th}>
                  Waiting period
                </th>
              </tr>
            </thead>
            <tbody>
              {CLASSES.map((coverageClass) => {
                const tier = tiers[coverageClass]
                return (
                  <tr key={coverageClass} className={table.row}>
                    <th scope="row" className={`${table.td} font-semibold text-ink`}>
                      {COVERAGE_LABEL[coverageClass]}
                      <span className="block font-normal text-ink-muted">{EXAMPLES[coverageClass]}</span>
                    </th>
                    <td className={table.num}>{tier.planPaysPctInNetwork}%</td>
                    <td className={table.num}>{tier.planPaysPctOutNetwork}%</td>
                    <td className={table.td}>{tier.deductibleApplies ? 'Yes' : 'No'}</td>
                    <td className={table.td}>
                      {tier.waitingPeriodMonths > 0 ? `${tier.waitingPeriodMonths} months` : 'None'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel id="limits" title="How often the plan pays">
        <p>Some care is only covered a set number of times per plan year. Extra visits are billed to you in full.</p>
        <div className={table.frame}>
          <table className={table.root}>
            <caption className={table.caption}>Frequency limits</caption>
            <thead className={table.head}>
              <tr>
                <th scope="col" className={table.th}>
                  Procedure
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  Covered per year
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  Used so far
                </th>
              </tr>
            </thead>
            <tbody>
              {LIMITED.map((p) => {
                const used = claims.filter((c) => c.cdtCode === p.cdtCode).length
                const limit = p.frequencyPerYear ?? 0
                return (
                  <tr key={p.cdtCode} className={table.row}>
                    <th scope="row" className={`${table.td} font-semibold text-ink`}>
                      {p.shortName}
                    </th>
                    <td className={table.num}>{limit}</td>
                    <td className={table.num}>
                      {used}
                      {used >= limit && <span className="block font-normal text-warning">None left this year</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel id="fine-print" title="The fine print, translated">
        {translations.length === 0 ? (
          <p>
            Translating the fine print needs your plan document. PDF upload is coming soon; the sample plan shows how it
            works.
          </p>
        ) : (
          <dl className="border-t-2 border-ink">
            {translations.map((t) => (
              <div key={t.id} className="border-b border-line py-5">
                <dt className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-muted">{t.topic}</dt>
                <dd className="mt-3 space-y-3">
                  <p className="border-l-2 border-line pl-4 font-serif text-[15px] italic leading-relaxed text-ink-muted">
                    <span className="sr-only">Your plan says: </span>
                    <q>{t.planText}</q>
                  </p>
                  <p className="text-ink">
                    <span className="font-semibold">In plain English: </span>
                    {t.plainEnglish}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Panel>
    </>
  )
}
