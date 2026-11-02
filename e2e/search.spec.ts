import { expect, test } from '@playwright/test';

test.describe('búsqueda', () => {
  test('busca desde la portada y muestra la sección correcta primero', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('combobox', { name: 'Buscar en la documentación' })
      .fill('create http server');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\?q=create\+http\+server$/);
    const first = page.locator('.result').first();
    await expect(first.getByRole('link')).toHaveText(
      'http.createServer([options][, requestListener])',
    );
    await expect(first.getByRole('link')).toHaveAttribute(
      'href',
      'https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener',
    );
    await expect(page.getByRole('status')).toContainText('resultados');
  });

  test('autocompleta con el teclado', async ({ page }) => {
    await page.goto('/');
    const input = page.getByRole('combobox');
    await input.fill('fs.writ');
    const options = page.getByRole('option');
    await expect(options.first()).toContainText('fs.writeFile');
    await input.press('ArrowDown');
    await expect(options.first()).toHaveAttribute('aria-selected', 'true');
    await expect(input).toHaveAttribute(
      'aria-activedescendant',
      (await options.first().getAttribute('id'))!,
    );
  });

  test('corrige erratas', async ({ page }) => {
    await page.goto('/?q=readFiel');
    await expect(page.locator('.result').first()).toContainText('fs.readFile');
    await page.getByRole('link', { name: 'readFile', exact: true }).click();
    await expect(page).toHaveURL(/\?q=readFile$/);
  });

  test('pagina y respeta el botón atrás', async ({ page }) => {
    await page.goto('/?q=stream');
    await page.getByRole('button', { name: '2', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole('status')).toContainText('página 2');
    await page.goBack();
    await expect(page.getByRole('status')).toContainText('página 1');
  });

  test('explica cuando no hay resultados', async ({ page }) => {
    await page.goto('/?q=zzqqxxyy');
    await expect(page.getByText('No hay secciones que coincidan')).toBeVisible();
  });

  test('no tiene scroll horizontal', async ({ page }) => {
    await page.goto('/?q=fs.readFile');
    await expect(page.locator('.result').first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test('la API responde con errores claros', async ({ request }) => {
  const response = await request.get('/api/search?q=');
  expect(response.status()).toBe(400);
  expect((await response.json()).error.code).toBe('invalid_request');
});
