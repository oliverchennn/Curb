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
    <h2 id="survey-site-heading">Site context</h2>
    <p className={styles.siteName}>{survey.site.name}</p>
    <p className={styles.small}>{SITE_KIND_LABELS[survey.site.kind]} · approx. {survey.site.latitude.toFixed(5)}, {survey.site.longitude.toFixed(5)}</p>
    <p className={styles.small}>{survey.site.locationNote}</p>

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
    <p className={styles.small}>Local map snapshot · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · 14 Nov 2026. Context only; no verified route graph.</p>

    {unplaced.length > 0 ? <div>
      <h3 className={styles.subheading}>Not placed on the map ({unplaced.length})</h3>
      <ul className={styles.chipList}>{unplaced.map((finding) => <li key={finding.id}>
        <button type="button" className={finding.id === selectedFindingId ? styles.chipSelected : styles.chip}
          aria-pressed={finding.id === selectedFindingId} onClick={() => onSelectFinding(finding.id)}>
          <span className={styles.swatch} style={{ background: finding.color }} aria-hidden="true" />
          {survey.findings.indexOf(finding) + 1}. {finding.label}
        </button>
      </li>)}</ul>
    </div> : null}

    <div className={styles.routeNote}>
      <strong>Route impact: unknown.</strong> {survey.routeAssessment.note}
    </div>
    {selectedArea ? <p className={styles.small}>Selected evidence belongs to work area <strong>{selectedArea.label}</strong>.</p> : null}
  </section>;
}
