import type { Survey } from '../../../contracts/curb/survey';
import { areaForFinding, splitByPlacement } from './presentation';
import styles from './SurveyWorkspace.module.css';

const SITE_KIND_LABELS: Record<Survey['site']['kind'], string> = {
  campus_path: 'Campus path',
  public_right_of_way: 'Public right-of-way',
  unknown: 'Site type unknown',
};

/** Approximate clip route on Prospect Avenue's north sidewalk outside Robertson Hall,
 * in the site map's 720x580 coordinates. Individual defects are not pinned. */
const CLIP_ROUTE = '358,396 440,367 474,355';

/** Locally retained map context: no live tiles and no
 * invented per-defect positions. Only accepted approximate placements are drawn. */
export function SiteContext({ survey, selectedFindingId, onSelectFinding }: {
  survey: Survey;
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
}) {
  const { placed } = splitByPlacement(survey);
  const selectedArea = selectedFindingId ? areaForFinding(survey, selectedFindingId) : undefined;
  return <section className={styles.sitePanel} aria-labelledby="survey-site-heading">
    <h3 id="survey-site-heading" className={styles.siteHeading}>Site context</h3>
    <p className={styles.siteName}>{survey.site.name}</p>
    <details className={styles.pendingChecks}>
      <summary>{SITE_KIND_LABELS[survey.site.kind]} · approximate location</summary>
      <p className={styles.small}>{survey.site.latitude.toFixed(5)}, {survey.site.longitude.toFixed(5)}. {survey.site.locationNote}</p>
    </details>

    <div className={styles.schematic} style={{height:'auto',aspectRatio:'720 / 580'}} role="group" aria-label="Local map context and reviewed approximate placements">
      <img src="/curb/surveys/robertson-hall/site-context.svg" alt="Robertson Hall, Washington Road and Prospect Avenue. Approximate phone GPS; mapped paths are unverified for accessibility." style={{display:'block',width:'100%',height:'100%',borderRadius:12}} />
      <svg className={styles.routeOverlay} viewBox="0 0 720 580" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={CLIP_ROUTE} fill="none" stroke="#fffdf8" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={CLIP_ROUTE} fill="none" stroke="#c2410c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10 12" />
      </svg>
      {placed.map((finding) => {
        const position = finding.mapPosition!;
        const selected = finding.id === selectedFindingId;
        return <button type="button" key={finding.id} className={selected ? styles.pinSelected : styles.pin}
          style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%`, borderColor: finding.color }}
          aria-pressed={selected} aria-label={`${finding.label}, approximate position. ${position.note}`}
          onClick={() => onSelectFinding(finding.id)}>
          <span aria-hidden="true">{survey.findings.indexOf(finding) + 1}</span>
        </button>;
      })}
    </div>
    <p className={styles.mapCredit}>Local map · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · Retrieved 14 Nov 2026</p>

    <p className={styles.unplacedNote}>
      <span className={styles.routeSwatch} aria-hidden="true" /> Clip route: north sidewalk of Prospect Avenue, outside Robertson Hall (approximate).
    </p>

    <details className={styles.routeNote}>
      <summary><strong>Route impact: unknown</strong></summary>
      <p>{survey.routeAssessment.note}</p>
    </details>
    {selectedArea ? <p className={styles.small}>Selected evidence: <strong>{selectedArea.label}</strong>.</p> : null}
  </section>;
}
