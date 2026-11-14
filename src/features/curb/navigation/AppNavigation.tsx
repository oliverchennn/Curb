'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AppNavigation.module.css';

const LINKS = [
  { href: '/curb/upload', label: 'Start survey' },
  { href: '/curb/surveys/robertson-hall', label: 'Survey replay' },
  { href: '/curb/collection', label: 'Collection demo' },
  { href: '/curb/explore', label: 'Route explorer' },
  { href: '/curb/plans', label: 'Sample network' },
];

export function AppNavigation() {
  const pathname = usePathname();
  return <nav className={styles.nav} aria-label="Main navigation">
    {LINKS.map(link => <Link key={link.href} href={link.href} prefetch={false} aria-current={pathname === link.href ? 'page' : undefined}>{link.label}</Link>)}
  </nav>;
}
