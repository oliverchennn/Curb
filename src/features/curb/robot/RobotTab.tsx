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
          The illustrative six-wheel sidewalk-survey robot that would capture the geometry behind a Curb survey.
          Take the <strong>guided tour</strong> through its subsystems — or let it play on its own — then follow the
          capture into the review and repair-planning flow. This is a{' '}
          <strong>concept / visual model, not validated hardware</strong>: every component is a generic envelope with
          no part numbers, ratings or performance claims.
        </p>
      </header>

      <RobotExplorer />

      <section
        aria-label="From capture to repair plan"
        style={{
          marginTop: 22, padding: '18px 20px', border: '1px solid #d6dfd7', borderRadius: 12,
          background: '#f2f7f1',
        }}
      >
        <p style={{ margin: '0 0 4px', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7a6f' }}>
          From capture to repair plan
        </p>
        <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>What the robot feeds</h2>
        <p style={{ margin: '0 0 12px', maxWidth: 720, lineHeight: 1.55, color: '#43554a', fontSize: 14 }}>
          The sensing payload is the start of the pipeline. Everything it would capture flows into the Curb
          survey — review the findings, compare equal-budget repairs and export the report.
        </p>
        <nav aria-label="Product flow" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontWeight: 600 }}>
          <Link href="/curb/upload">Start a survey →</Link>
          <Link href="/curb/surveys/robertson-hall">Robertson Hall review →</Link>
          <Link href="/curb/plans">Repair priorities →</Link>
          <Link href="/curb/collection">Collection concept →</Link>
        </nav>
      </section>
    </main>
  );
}
