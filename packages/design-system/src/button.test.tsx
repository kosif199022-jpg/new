import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Button } from './button.js';

it('renders a semantic button with the requested variant', () => {
  const html = renderToStaticMarkup(<Button variant="secondary">مراجعة</Button>);
  expect(html).toContain('<button');
  expect(html).toContain('new-button--secondary');
  expect(html).toContain('مراجعة');
});
