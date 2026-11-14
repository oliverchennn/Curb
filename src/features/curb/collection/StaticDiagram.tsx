import { poseAt, type SensorId } from './simulation';
import styles from './collection.module.css';

export function StaticDiagram({ seconds, sensor }: { seconds: number; sensor: SensorId }) {
  const pose = poseAt(seconds);
  const x = 180 + (pose.x + 6) / 12 * 460;
  return <div className={styles.diagram}>
    <svg viewBox="0 0 880 480" role="img" aria-labelledby="collection-diagram-title collection-diagram-description">
      <title id="collection-diagram-title">Camera collection concept, static diagram</title>
      <desc id="collection-diagram-description">A six-wheel robot on a schematic sidewalk. A mast camera looks forward, a lower camera looks down at the surface and a side camera faces the curb. Scrubbing moves the illustration; no physical survey is shown.</desc>
      <rect width="880" height="480" rx="20" fill="#e7ecdf" />
      <path d="M0 345H880V480H0Z" fill="#b7bdb6" />
      <path d="M0 195H880V335H0Z" fill="#f4f0e5" />
      <path d="M0 335H880V345H0Z" fill="#c1bba9" />
      {[100, 250, 400, 550, 700].map(i => <path key={i} d={`M${i} 195V335`} stroke="#d0cbbc" strokeWidth="2" />)}
      <path d="m448 215-8 18 12 12-15 19 9 17-8 26" fill="none" stroke="#797665" strokeWidth="3" />
      <rect x="600" y="240" width="54" height="38" rx="9" fill="#c1b9a6" />
      <g transform={`translate(${x},260)`}>
        <path d="M28-68 165-110 165-5Z" fill="#28765e" opacity={sensor === 'forward' ? '.18' : '.04'} />
        <path d="M38-15 68 53 5 53Z" fill="#b47e25" opacity={sensor === 'surface' ? '.25' : '.06'} />
        <path d="M0-30-70 80 70 80Z" fill="#237487" opacity={sensor === 'curb' ? '.2' : '.03'} />
        <rect x="-65" y="-38" width="125" height="65" rx="18" fill="#fffaf0" stroke="#8e9789" strokeWidth="2" />
        <rect x="-65" y="15" width="125" height="13" rx="4" fill="#243b30" />
        {[-43, 0, 43].map(i => <g key={i}><circle cx={i} cy="30" r="17" fill="#303b34" /><circle cx={i} cy="30" r="9" fill="#aeb8a7" /></g>)}
        <path d="M25-35V-76" stroke="#34493c" strokeWidth="6" />
        <rect x="14" y="-88" width="29" height="20" rx="6" fill="#28765e" />
        <circle cx="38" cy="-10" r="7" fill="#98621a" />
        <circle cx="-7" cy="0" r="7" fill="#237487" />
        <text x="-42" y="0" fill="#274537" fontSize="18" fontWeight="700">CURB</text>
      </g>
      <g fill="#173b2c" fontSize="17" fontFamily="system-ui,sans-serif">
        <text x="34" y="42" fontWeight="700">ILLUSTRATIVE SIDE VIEW</text>
        <text x="34" y="75">01 Forward context · 02 Surface detail · 03 Curb context</text>
        <text x="34" y="423">Use the sensor buttons for descriptions. Scrub to inspect the sequence.</text>
      </g>
    </svg>
  </div>;
}
