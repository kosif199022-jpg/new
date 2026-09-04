export type Locale = 'ar' | 'en';

export function localeDirection(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function applyDocumentLocale(documentElement: Pick<HTMLElement, 'lang' | 'dir'>, locale: Locale): void {
  documentElement.lang = locale;
  documentElement.dir = localeDirection(locale);
}
