import type { Survey } from '../../../contracts/curb/survey';
import { areaForFinding, splitByPlacement } from './presentation';
import styles from './SurveyWorkspace.module.css';

const SITE_KIND_LABELS: Record<Survey['site']['kind'], string> = {
  campus_path: 'Campus path',
  public_right_of_way: 'Public right-of-way',
  unknown: 'Site type unknown',
};

/** Locally retained map context: no live tiles and no
 * invented per-defect positions. Only accepted approximate placements are drawn. */
export function SiteContext({ survey, selectedFindingId, onSelectFinding }: {
  survey: Survey;
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
}) {
  const { placed, unplaced } = splitByPlacement(survey);
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

    {/* Unplaced findings are listed, not drawn: positions are unverified, so no pin is invented.
        They stay selectable from the findings list and the evidence buttons under the video. */}
    {unplaced.length > 0 ? <p className={styles.unplacedNote}>
      <strong>Not placed on the map ({unplaced.length}):</strong> {unplaced.map((finding) => finding.label.replace(/ · .*$/, '')).join(', ')}. Per-defect positions are not verified.
    </p> : null}

    <details className={styles.routeNote}>
      <summary><strong>Route impact: unknown</strong></summary>
      <p>{survey.routeAssessment.note}</p>
    </details>
    {selectedArea ? <p className={styles.small}>Selected evidence: <strong>{selectedArea.label}</strong>.</p> : null}
  </section>;
}
