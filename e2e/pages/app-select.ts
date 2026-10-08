import { Locator, Page } from '@playwright/test';

/**
 * Elige una opción de un `app-select` (selector personalizado de una opción,
 * combobox + listbox). Si el selector tiene buscador (listas largas), `search`
 * filtra primero para no depender del scroll del desplegable.
 */
export async function chooseSelectOption(
  page: Page,
  combobox: Locator,
  optionName: string | RegExp,
  search?: string,
): Promise<void> {
  await combobox.click();
  if (search !== undefined) {
    await page.getByRole('combobox', { name: 'Buscar' }).fill(search);
  }
  await page.getByRole('option', { name: optionName }).first().click();
}
