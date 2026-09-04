import { useEffect, useState } from 'react';
import { Button, Card } from '@new/design-system';
import { ar } from './i18n/ar.js';
import { en } from './i18n/en.js';
import { AppShell } from './layout/app-shell.js';
import { applyDocumentLocale, type Locale } from './locale.js';

const capabilityCards = [
  ['المالية', 'دفتر أستاذ، فواتير، أصول، مخزون، ضريبة، عملات وتسويات.'],
  ['التدقيق', 'مخاطر، أهمية نسبية، عينات، PBC، أدلة، ملاحظات واستنتاجات بشرية.'],
  ['الذكاء المحكوم', 'مزودون متعددون، مجالس مستقلة، معرفة موثقة وصوت لا يتجاوز الصلاحيات.'],
  ['التكاملات', 'ERP، بنوك، مستندات، بريد، CRM، بيانات، MCP وعميل متصفح مضبوط.']
] as const;

export function App({ locale: initialLocale = 'ar' }: { locale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = locale === 'ar' ? ar : en;

  useEffect(() => { applyDocumentLocale(document.documentElement, locale); }, [locale]);

  return (
    <AppShell locale={locale}>
      <header className="topbar">
        <div>
          <div className="eyebrow">{t.status.governed} · {t.status.tenantSafe}</div>
          <h1>{locale === 'ar' ? 'مركز القيادة المالية والتدقيقية' : 'Finance & Audit Command Center'}</h1>
        </div>
        <Button variant="secondary" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}>
          {locale === 'ar' ? 'English' : 'العربية'}
        </Button>
      </header>

      <section className="hero-grid" aria-label={locale === 'ar' ? 'ملخص المنصة' : 'Platform summary'}>
        <Card eyebrow={locale === 'ar' ? 'حالة المنصة' : 'Platform state'} heading={locale === 'ar' ? 'أساس موحّد، صلاحيات واضحة' : 'One foundation, explicit authority'} className="hero-card hero-card--primary">
          <p>{locale === 'ar' ? 'كل عملية مؤثرة تمر عبر tenant وصلاحية وسجل أثر. الذكاء الاصطناعي يقترح ويشرح؛ الإنسان يعتمد.' : 'Every material action is tenant-scoped, authorized and traceable. AI proposes and explains; humans approve.'}</p>
          <div className="status-row">
            <span className="status-pill status-pill--ok">{locale === 'ar' ? 'RTL أصلي' : 'Native RTL'}</span>
            <span className="status-pill status-pill--ok">{t.status.humanApproval}</span>
            <span className="status-pill">Multi-provider</span>
          </div>
        </Card>
        <Card eyebrow={locale === 'ar' ? 'الجاهزية' : 'Readiness'} heading={locale === 'ar' ? 'البنية الأساسية قيد البناء' : 'Foundation in progress'}>
          <div className="metric"><strong>8</strong><span>{locale === 'ar' ? 'مسارات تنفيذ' : 'implementation tracks'}</span></div>
          <div className="metric"><strong>14</strong><span>{locale === 'ar' ? 'مساحة عمل' : 'workspaces'}</span></div>
        </Card>
      </section>

      <section className="capability-grid" aria-label={locale === 'ar' ? 'القدرات' : 'Capabilities'}>
        {capabilityCards.map(([title, description]) => <Card key={title} heading={title}><p>{description}</p></Card>)}
      </section>
    </AppShell>
  );
}
