'use client';

export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="hero" role="alert">
      <h1>Could not load this page</h1>
      <button type="button" onClick={reset}>Try again</button>
    </section>
  );
}
