import { CAPTURES, DURATION, poseAt, type SensorId } from './simulation';
import styles from './collection.module.css';

export function SchematicFeed({ sensor, seconds }: { sensor: SensorId; seconds: number }) {
  const { inspection } = poseAt(seconds);
  return <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="320" height="180" fill="#deddd0" />
    {sensor === 'forward' ? <>
      <path d="M0 71 320 71V180H0Z" fill="#aab598" />
      <path d="M129 71h62l99 109H30z" fill="#cfc9b5" />
      <path d="M129 72 30 179M191 72l99 107M101 102h118M71 135h179" stroke="#ede9d9" fill="none" strokeWidth="3" />
      <path d="M230 71h90v109h-20l-99-109" fill="#8f9a8c" />
      <path d="M20 71V46h69v25m9 0V34h26v37" fill="#98a790" />
      <circle cx="238" cy="49" r="25" fill="#788d71" />
      {inspection ? <path d="m111 135 16-4 19 7 20-9 23 6 21-5" fill="none" stroke="#775c44" strokeWidth="3" /> : null}
    </> : sensor === 'surface' ? <>
      <path d="M0 37h320M0 143h320M37 0v180m246-180v180" stroke="#f6f0df" strokeWidth="4" />
      {[33, 83, 109, 168, 218, 277].map((x, i) => <circle key={x} cx={x} cy={61 + (i * 23) % 72} r={i % 2 ? 3 : 2} fill="#a39b82" />)}
      {inspection?.kind === 'crack' ? <path d="m28 85 39-7 31 20 33-8 30 16 37-14 29 6 61-19m-157 11 21-35 42-9"
        stroke="#604939" fill="none" strokeWidth="4" strokeLinejoin="round" /> : null}
      {inspection?.kind === 'patch' ? <path d="m96 78 21-18 53 3 33-11 30 25-8 30-40 24-44-6-30-14z" fill="#9d9271" /> : null}
    </> : <>
      <path d="M0 61H320V180H0z" fill="#71847a" />
      <path d="M0 31h320v44L0 125z" fill="#d0c9b2" />
      <path d="M0 125 320 75v13L0 145z" fill="#afa78e" />
      <path d="M0 145 320 88M70 114 43 31m109 69-20-69m107 55-9-55" fill="none" stroke="#e4decd" strokeWidth="2" />
      <path d="M27 164 102 151m86-12 64-11" stroke="#b8bdaf" strokeWidth="4" />
    </>}
  </svg>;
}

export function StaticDiagram({ seconds, sensor }: { seconds: number; sensor: SensorId }) {
  const pose = poseAt(seconds);
  const x = 131 + pose.fraction * 620;
  const y = 238 + pose.z * 28;
  return <div className={styles.diagram}>
    <svg viewBox="0 0 880 460" role="img" aria-labelledby="rover-static-title rover-static-description">
      <title id="rover-static-title">Modeled rover route and inspection stops</title>
      <desc id="rover-static-description">A six-wheel rover moves over a modeled sidewalk. Two marked stops show the illustrative crack and rough patch. The alternative camera diagrams are available in the workspace.</desc>
      <rect width="880" height="460" fill="#dce2cf" />
      <path d="M0 340H880V460H0Z" fill="#a5b0a3" />
      <path d="M0 161H880V329H0Z" fill="#f0ecdc" />
      <path d="M0 329H880V343H0Z" fill="#b9b39e" />
      {[95, 235, 375, 515, 655, 795].map(value => <path key={value} d={'M' + value + ' 161V329'}
        stroke="#cfc8b4" strokeWidth="3" />)}
      <path d="M66 269 Q296 195 450 252 T807 255" fill="none" stroke="#b39a61" strokeDasharray="7 10" strokeWidth="2.5" />
      {CAPTURES.map(capture => <g key={capture.id} transform={'translate(' + (131 + capture.fraction * 620) + ' 286)'}>
        <path d={capture.kind === 'crack' ? 'm-21-7 12-7 11 11 14-8 19 7' : 'm-17-17 26-2 21 10-6 22-30 4-16-10z'}
          fill={capture.kind === 'patch' ? '#918365' : 'none'} stroke="#695c49" strokeWidth="3" />
        <text x="4" y="38" textAnchor="middle" fill="#274638" fontSize="17" fontWeight="700">{capture.id}</text>
      </g>)}
      <g transform={'translate(' + x + ' ' + y + ')'}>
        <path d="M27-62 124-85 123 3Z" fill="#28765e" opacity={sensor === 'forward' ? '.22' : '.03'} />
        <path d="M52-9 89 48 33 48Z" fill="#b47e25" opacity={sensor === 'surface' ? '.27' : '.05'} />
        <path d="M0-20-61 71 65 71Z" fill="#237487" opacity={sensor === 'curb' ? '.23' : '.04'} />
        <ellipse cx="0" cy="43" rx="69" ry="10" fill="#4e5e4c" opacity=".2" />
        <rect x="-66" y="-35" width="132" height="64" rx="17" fill="#fffaf0" stroke="#8e9789" strokeWidth="2" />
        <rect x="-66" y="13" width="132" height="17" rx="5" fill="#243b30" />
        {[-44, 0, 44].map(value => <g key={value}><circle cx={value} cy="32" r="17" fill="#2d3b34" />
          <circle cx={value} cy="32" r="9" fill="#aab3a6" /><circle cx={value} cy="32" r="3.5" fill="#3a5445" /></g>)}
        <path d="M26-34V-67" stroke="#34493c" strokeWidth="7" />
        <rect x="18" y="-80" width="30" height="20" rx="6" fill="#28765e" />
        <circle cx="55" cy="-7" r="8" fill="#98621a" />
        <circle cx="-17" cy="-5" r="8" fill="#237487" />
        <text x="0" y="4" fill="#274537" fontSize="18" fontWeight="700" textAnchor="middle">CURB</text>
      </g>
      <text x="31" y="47" fontSize="23" fontWeight="700" fill="#274638">Sidewalk inspection diagram</text>
      <text x="31" y="78" fontSize="17" fill="#274638">{Math.floor(seconds)} of {DURATION} seconds · {pose.count} of {CAPTURES.length} stops captured</text>
    </svg>
  </div>;
}
