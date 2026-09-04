import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './app.js';
import { localeDirection } from './locale.js';

describe('App', () => {
  it('renders the Arabic-first shell and main workspaces', () => {
    const html = renderToStaticMarkup(<App locale="ar" />);
    expect(localeDirection('ar')).toBe('rtl');
    expect(html).toContain('المحاسبة');
    expect(html).toContain('التدقيق');
    expect(html).toContain('المجالس');
    expect(html).toContain('الصوت');
    expect(html).toContain('التكاملات');
  });
});
