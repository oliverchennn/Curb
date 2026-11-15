import { useRef } from 'react';
import blair from '../../../data/curb/princeton-route-demo/blair.json';
import { boundsExtent, type ProjectedView } from './campus';
import { project } from './model';
import styles from './Explorer.module.css';

function metres(feet: number) {
  return feet * 0.3048;
}

const googleDetour = metres(blair.google.wheelchairTransitWalkingStepsFeet.reduce((sum, feet) => sum + feet, 0));
const difference = Math.round(googleDetour - blair.stepFree.distanceMeters);
const lengths = { route: Math.round(blair.stepFree.distanceMeters), googleDetour: Math.round(googleDetour) };

function svgPath(coordinates: number[][]) {
  return coordinates.map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'}${project([lon, lat]).join(',')}`).join(' ');
}

export function blairRouteBounds(): ProjectedView {
  const lons = blair.stepFree.coordinates.map(point => point[0]);
  const lats = blair.stepFree.coordinates.map(point => point[1]);
  const { x, y, width, height } = boundsExtent([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]);
  return [x - 12, y - 12, width + 24, height + 24];
}

export function BlairRouteForm({ shown, onShow, onClear }: {
  shown: boolean;
  onShow: () => void;
  onClear: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const showButton = useRef<HTMLButtonElement>(null);
  return <section ref={panel} className={styles.routeDemo} aria-labelledby="blair-demo-heading">
    <div className={styles.routeDemoHeading}>
      <h3 id="blair-demo-heading">Find a campus route</h3>
      <span>One prepared route</span>
    </div>
    <form className={styles.routeForm} onSubmit={event => {
      event.preventDefault();
      onShow();
      panel.current?.scrollIntoView({ block: 'start' });
    }}>
      <label>From<select name="from"><option value="blair-lower">{blair.from.label}</option></select></label>
      <label>To<select name="to"><option value="blair-upper">{blair.to.label}</option></select></label>
      <button ref={showButton} type="submit">Show route</button>
      {shown && <button className={styles.routeClear} type="button" onClick={() => {
        onClear();
        showButton.current?.focus();
      }}>Clear route</button>}
    </form>
    {shown && <div className={styles.routeResults}>
      <p role="status"><strong>{lengths.route} m around the stairs.</strong> Princeton’s step-free route was about {difference} m shorter than the walking itinerary Google displayed with wheelchair-accessible transit selected.</p>
      <ul>
        <li><span className={styles.routeBlue} aria-hidden="true" /><span><b>{lengths.route} m</b> · Princeton step-free route</span></li>
        <li><span className={styles.routeStairs} aria-hidden="true" /><span><b>{blair.google.walkingFeet} ft</b> · Google walking shortcut says “{blair.google.walkingInstruction}”</span></li>
        <li><span><b>About {lengths.googleDetour} m</b> · Google’s alternate walking itinerary via University Place, summed from its displayed steps</span></li>
      </ul>
      <p className={styles.routeDetails}>Compared {blair.observedOn}. Princeton’s route may include steep slopes. <a href={blair.stepFree.mapUrl}>Princeton map</a> · <a href={blair.stairs.guideUrl}>Blair Arch access guide</a> · <a href={blair.google.walkingUrl}>Google walking directions</a> · <a href={blair.google.transitUrl}>Google transit directions</a></p>
    </div>}
  </section>;
}

export function BlairRouteLines({ unit }: { unit: number }) {
  return <g className={styles.routeLines} aria-hidden="true" data-route="blair-arch">
    <path d={svgPath(blair.stepFree.coordinates)} className={styles.routeHalo} vectorEffect="non-scaling-stroke" />
    <path d={svgPath(blair.stepFree.coordinates)} className={styles.routePath} vectorEffect="non-scaling-stroke" />
    <path d={svgPath(blair.stairs.coordinates)} className={styles.routeHalo} vectorEffect="non-scaling-stroke" />
    <path d={svgPath(blair.stairs.coordinates)} className={styles.stairPath} vectorEffect="non-scaling-stroke" />
    {[blair.from, blair.to].map(({ coordinates: [lon, lat] }, i) => {
      const [x, y] = project([lon, lat]);
      return <g key={i} transform={`translate(${x},${y})`}>
        <circle r={10 * unit} fill="#fff" stroke="#074d9d" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <text y={4 * unit} fontSize={11 * unit} textAnchor="middle" fontWeight="800" fill="#074d9d">{i === 0 ? 'A' : 'B'}</text>
      </g>;
    })}
  </g>;
}
