import { Page } from '@playwright/test';

/**
 * Abre una sección de Configuración (/configuracion). En viewport ancho el menú
 * lateral siempre está visible; por debajo de `lg` está detrás del botón
 * "Sección: …", que solo se abre si la entrada no se ve. Se localiza con CSS y
 * no con getByRole porque este ignora lo oculto.
 */
export async function openSettingsSection(page: Page, label: string): Promise<void> {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const entry = page
    .locator('nav[aria-label="Secciones de configuración"] button[data-section-id]')
    .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) });
  await entry.waitFor({ state: 'attached' });
  if (!(await entry.isVisible())) {
    await page.getByRole('button', { name: /^Sección:/ }).click();
  }
  await entry.click();
}
