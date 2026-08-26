import { expect, test } from '@playwright/test';

// BUG-13: nginx era la única fuente de estos headers, pero los `location`
// que definen su propio `add_header` (Cache-Control) dejaban de heredar los
// de seguridad del `server`, y `/api/*` los sumaba con los de helmet
// (backend) sin ocultarlos — duplicados, dos en conflicto real
// (X-Frame-Options, Referrer-Policy). Playwright normaliza headers
// duplicados uniéndolos con ", " (semántica fetch), así que un `toBe` con
// el valor exacto de nginx falla solo si vuelve a haber duplicación.
const EXPECTED_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
};

test.describe('BUG-13 — headers de seguridad', () => {
  for (const path of ['/', '/api/health']) {
    test(`${path} trae cada header de seguridad exactamente una vez, con el valor de nginx`, async ({
      request,
    }) => {
      const response = await request.get(path);
      const headers = response.headers();

      for (const [name, expected] of Object.entries(EXPECTED_HEADERS)) {
        expect(headers[name], `header "${name}" en ${path}`).toBe(expected);
      }
    });
  }
});
