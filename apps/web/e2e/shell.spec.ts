import { expect, test } from '@playwright/test';

test('Arabic shell loads and exposes main workspaces', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('navigation')).toContainText('التدقيق');
  await expect(page.getByRole('navigation')).toContainText('المحاسبة');
  await expect(page.getByRole('navigation')).toContainText('المجالس');
  await expect(page.getByRole('navigation')).toContainText('الصوت');
  await expect(page.getByRole('navigation')).toContainText('التكاملات');
});

test('locale switch changes document direction', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('navigation')).toContainText('Accounting');
});
