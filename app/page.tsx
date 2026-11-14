import Link from 'next/link';

export default function Home() {
  return (
    <section className="hero">
      <h1>Accessibility repair planning</h1>
      <p className="lede">Plan campus repairs with evidence about sidewalk barriers.</p>
      <p><Link href="/curb">Open Curb</Link></p>
    </section>
  );
}
