'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const RobotExplorer = dynamic(() => import('./RobotExplorer'), {
  ssr: false,
  loading: () => (
    <div role="status" style={{ padding: 48, border: '1px solid #d6dfd7', borderRadius: 12, background: '#f7f9f5' }}>
      Preparing the 3D model…
    </div>
  ),
});

export function RobotTab() {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 16px 48px', color: '#20372c' }}>
      <header style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7a6f' }}>
          Concept hardware
        </p>
        <h1 style={{ margin: '0 0 8px', fontSize: 26 }}>Curb survey robot — CAD model</h1>
        <p style={{ margin: 0, maxWidth: 760, lineHeight: 1.55, color: '#43554a' }}>
          An interactive model of the illustrative six-wheel sidewalk-survey robot from the{' '}
          <Link href="/curb/collection">collection concept</Link>. The robot auto-orbits; hover a group of
          components to highlight it, click to isolate and explode that group, then open any numbered part for its
          purpose. This is a <strong>concept / visual model, not validated hardware</strong> — every component is a
          generic envelope with no part numbers, ratings or performance claims.
        </p>
      </header>

      <RobotExplorer />

      <nav aria-label="Related pages" style={{ marginTop: 20, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <Link href="/curb/collection">How collection would work →</Link>
        <Link href="/curb">Campus barrier review →</Link>
      </nav>
    </main>
  );
}
