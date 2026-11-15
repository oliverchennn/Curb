'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AppNavigation.module.css';

const LINKS = [
  { href: '/curb/upload', label: 'Start survey' },
  { href: '/curb/surveys/robertson-hall', label: 'Survey replay' },
  { href: '/curb/collection', label: 'Collection demo' },
  { href: '/curb/explore', label: 'Route explorer' },
  { href: '/curb/plans', label: 'Repair priorities' },
  { href: '/curb/investment-demo', label: 'Investment demo' },
];

function resetCurrentPage() {
  const url = new URL(window.location.href);
  if (!url.search && !url.hash) {
    window.location.reload();
    return;
  }
  url.search = '';
  url.hash = '';
  window.location.replace(url.href);
}

export function AppNavigation() {
  const pathname = usePathname();
  return <nav className={styles.nav} aria-label="Main navigation">
    {LINKS.map(link => <Link key={link.href} href={link.href} prefetch={false} aria-current={pathname === link.href ? 'page' : undefined}>{link.label}</Link>)}
    <button type="button" className={styles.resetButton} onClick={resetCurrentPage}>Reset demo</button>
  </nav>;
}
