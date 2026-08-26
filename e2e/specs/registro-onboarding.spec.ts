import { expect, test } from '@playwright/test';
import { RegistroPage } from '../pages/registro.page';
import { OnboardingPage } from '../pages/onboarding.page';
import { fetchVerificationToken } from '../shared/mailpit';

/**
 * Flujo 3 (HU-FE-E2E-2): registro simplificado (F5) -> verificación de
 * correo por UI -> wizard de onboarding -> dashboard.
 *
 * A diferencia del resto de specs de este repo, este NO usa
 * `tenant-fixture.ts` — ese fixture registra y verifica el tenant vía API
 * directamente, que es justo lo que este flujo necesita probar por UI
 * real (formulario de registro + click real en el link del correo). Genera
 * su propio tenant único con timestamp, igual que `uniqueSuffix()` en
 * tenant-fixture.ts.
 */
function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
}

test.describe('Registro y onboarding (F5)', () => {
  test('registro por UI -> verificación de correo -> wizard de onboarding -> dashboard', async ({ page }) => {
    const suffix = uniqueSuffix();
    const email = `registro.e2e.${suffix}@lexar-test.com`;
    const password = 'Passw0rd!E2E';

    const registroPage = new RegistroPage(page);
    await registroPage.goto();
    await registroPage.fillAndSubmit({
      firstName: 'Registro',
      lastName: 'E2E',
      email,
      password,
      legalName: `Bufete Registro E2E ${suffix}`,
      taxId: `TAXID-REG-${suffix}`,
    });

    // El registro abre sesión de inmediato (cookie), pero el correo aún no
    // está verificado. El propio RegisterComponent intenta navegar a
    // /onboarding, pero emailVerifiedGuard intercepta esa navegación (el
    // usuario es isOwner con emailVerified=false) y termina mandando a
    // /verificar-pendiente — ver email-verified.guard.ts.
    await expect(page).toHaveURL(/\/verificar-pendiente$/);
    await expect(page.getByText('Verifica tu correo para continuar')).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    const token = await fetchVerificationToken(email);

    // Simula el click real del usuario en el enlace del correo: navegación
    // de browser (page.goto a la ruta pública /verificar-correo), no una
    // llamada directa al endpoint de la API.
    await page.goto(`/verificar-correo?token=${token}`);
    await expect(page.getByText('Tu correo fue verificado exitosamente.')).toBeVisible();

    // VerifyEmailComponent redirige solo a /dashboard automáticamente 2s
    // después de confirmar. El onboarding no está completo todavía, así que
    // en vez de depender de ese timer navegamos directo a /onboarding: para
    // ese momento el correo ya quedó verificado en el backend (la llamada
    // POST /verify-email de arriba ya resolvió), así que
    // authGuard/emailVerifiedGuard/twoFactorRequiredGuard dejan pasar.
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/onboarding$/);

    const onboardingPage = new OnboardingPage(page);
    // Paso 1 (datos legales) y paso 2 (invitar equipo) se saltan con
    // confirmación — cada "Saltar por ahora" abre el mismo diálogo de
    // confirmación (ver onboarding.component.ts).
    await onboardingPage.skipStep();
    await onboardingPage.skipStep();
    await onboardingPage.finishWithConfirmation();

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
