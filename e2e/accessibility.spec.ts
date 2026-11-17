import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Auditoría WCAG 2.1 AA automática (axe-core) de las dos vistas, en claro y oscuro. */
for (const theme of ['light', 'dark'] as const) {
  for (const [name, path, ready] of [
    ['portada', '/', '.home__title'],
    ['resultados', '/?q=readFiel', '.result'],
  ] as const) {
    test(`${name} sin problemas de accesibilidad (${theme})`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('docseek-theme', value), theme);
      await page.goto(path);
      await page.locator(ready).first().waitFor();
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(
        violations.map(({ id, nodes }) => `${id}: ${nodes.map((n) => n.target).join(', ')}`),
      ).toEqual([]);
    });
  }
}
