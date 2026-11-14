import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Curb',
  description: 'Accessibility repair planning for campus facilities.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header>
          <Link href="/" className="brand">
            <span aria-hidden="true" className="brandMark">c</span> Curb
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/curb/upload">Upload demo</Link>
            <Link href="/curb/surveys/robertson-hall">Survey workspace</Link>
            <Link href="/curb/plans">Sample network</Link>
          </nav>
        </header>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
