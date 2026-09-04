import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Card } from './card.js';

it('renders rich heading content without shadowing the native title attribute', () => {
  const html = renderToStaticMarkup(
    <Card heading={<span>عنوان مرئي</span>} title="تلميح أصلي">
      محتوى
    </Card>
  );

  expect(html).toContain('title="تلميح أصلي"');
  expect(html).toContain('<h2 class="new-card__title"><span>عنوان مرئي</span></h2>');
  expect(html).toContain('محتوى');
});
