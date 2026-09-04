import type { ReactNode } from 'react';
import { ar } from '../i18n/ar.js';
import { en } from '../i18n/en.js';
import type { Locale } from '../locale.js';

type Dictionary = typeof ar | typeof en;

const navOrder = ['dashboard', 'accounting', 'audit', 'reconciliation', 'analytics', 'evidence', 'statements', 'reports', 'knowledge', 'council', 'voice', 'workflows', 'integrations', 'administration'] as const;

export function AppShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t: Dictionary = locale === 'ar' ? ar : en;
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label={locale === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}>
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">N</div>
          <div><strong>{t.appName}</strong><span>{t.tagline}</span></div>
        </div>
        <nav>
          {navOrder.map((key, index) => (
            <a key={key} className={index === 0 ? 'nav-link nav-link--active' : 'nav-link'} href={`#${key}`}>
              <span className="nav-link__dot" aria-hidden="true" />
              <span>{t.nav[key]}</span>
            </a>
          ))}
        </nav>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
