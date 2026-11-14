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
            Curb
          </Link>
        </header>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
