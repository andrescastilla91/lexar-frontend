import { APIRequestContext, request, test as base } from '@playwright/test';
import { E2E_API_ORIGIN } from './environment';
import { registerTenant, TestTenant, uniqueSuffix } from './tenant-fixture';

export interface PortalReadyTenant extends TestTenant {
  clientId: string;
  clientFullName: string;
  legalProcessId: string;
  legalProcessTitle: string;
  documentFilename: string;
}

/**
 * Sube un archivo real al S3/MinIO del stack e2e para poder probar la
 * descarga desde el portal (no solo la metadata). Reproduce las 3 llamadas
 * que hace `entity-files.component.ts` en el frontend: pedir URL firmada,
 * subir los bytes directo a esa URL (S3Service firma también
 * `ContentLength`, así que el tamaño declarado debe coincidir exacto con el
 * body real — ver s3.service.ts) y registrar la metadata. El PUT a la URL
 * firmada solo funciona si `S3_ENDPOINT_PUBLIC` (backend) es alcanzable
 * desde donde corre Playwright — mismo supuesto que ya vale para
 * `E2E_API_ORIGIN`/`E2E_MAILPIT_ORIGIN`, ver environment.ts.
 */
async function uploadVisibleDocument(
  api: APIRequestContext,
  legalProcessId: string,
): Promise<string> {
  const filename = 'contrato-e2e.pdf';
  const contentType = 'application/pdf';
  const content = Buffer.from(
    '%PDF-1.4 Documento de prueba E2E — Portal del cliente (HU-FE-E2E-2).',
    'utf-8',
  );

  const signedUrlResponse = await api.post('/api/files/signed-url', {
    data: {
      filename,
      contentType,
      size: content.byteLength,
      entityType: 'legal_process',
      entityId: legalProcessId,
    },
  });
  if (!signedUrlResponse.ok()) {
    throw new Error(
      `No se pudo generar la URL firmada de subida: ${signedUrlResponse.status()} ${await signedUrlResponse.text()}`,
    );
  }
  const { url, key, bucket } = (await signedUrlResponse.json()) as {
    url: string;
    key: string;
    bucket: string;
  };

  const uploadResponse = await api.put(url, {
    data: content,
    headers: { 'Content-Type': contentType },
  });
  if (!uploadResponse.ok()) {
    throw new Error(
      `No se pudo subir el archivo de prueba directamente a S3 (¿S3_ENDPOINT_PUBLIC no es ` +
        `alcanzable desde donde corre Playwright?): ${uploadResponse.status()} ${await uploadResponse.text()}`,
    );
  }

  const registerResponse = await api.post('/api/files', {
    data: {
      key,
      bucket,
      originalFilename: filename,
      contentType,
      size: content.byteLength,
      entityType: 'legal_process',
      entityId: legalProcessId,
    },
  });
  if (!registerResponse.ok()) {
    throw new Error(
      `No se pudo registrar la metadata del archivo de prueba: ${registerResponse.status()} ${await registerResponse.text()}`,
    );
  }
  const { id: fileId } = (await registerResponse.json()) as { id: string };

  const visibilityResponse = await api.patch(`/api/files/${fileId}/visibility`, {
    data: { visibleToClient: true },
  });
  if (!visibilityResponse.ok()) {
    throw new Error(
      `No se pudo marcar el archivo de prueba como visible para el cliente: ${visibilityResponse.status()} ${await visibilityResponse.text()}`,
    );
  }

  return filename;
}

/**
 * Deja visible en la línea de tiempo del portal el evento PROCESS_CREATED
 * que `legalProcessesService.create()` registra automáticamente — por
 * defecto `visibleToClient` nace en `false` (F16: "visibilidad explícita,
 * nunca por defecto", ver process-event.entity.ts).
 */
async function makeProcessCreatedEventVisible(
  api: APIRequestContext,
  legalProcessId: string,
): Promise<void> {
  const historyResponse = await api.get(`/api/legal-processes/${legalProcessId}/history`);
  if (!historyResponse.ok()) {
    throw new Error(
      `No se pudo leer el historial del proceso de prueba: ${historyResponse.status()} ${await historyResponse.text()}`,
    );
  }
  const { events } = (await historyResponse.json()) as {
    events: { id: string; type: string }[];
  };
  const createdEvent = events.find((event) => event.type === 'PROCESS_CREATED');
  if (!createdEvent) {
    throw new Error('El proceso de prueba no tiene un evento PROCESS_CREATED en su historial.');
  }

  const visibilityResponse = await api.patch(
    `/api/legal-processes/${legalProcessId}/events/${createdEvent.id}/visibility`,
    { data: { visibleToClient: true } },
  );
  if (!visibilityResponse.ok()) {
    throw new Error(
      `No se pudo marcar el evento del proceso como visible para el cliente: ${visibilityResponse.status()} ${await visibilityResponse.text()}`,
    );
  }
}

/**
 * Prepara, vía API, todo lo que el flujo de portal (HU-FE-E2E-2) necesita
 * que YA exista del lado del despacho antes de poder invitar a un cliente:
 * un `Client` con un `LegalProcess` que tenga un evento y un documento
 * visibles en el portal. La invitación y activación del `ClientPortalUser`
 * las hace el spec por UI (es la superficie que este flujo debe probar de
 * verdad — mandato H6 del reporte 02), así que este fixture NO las hace.
 */
export const test = base.extend<{ tenant: TestTenant; portalTenant: PortalReadyTenant }>({
  tenant: async ({}, use) => {
    const api = await request.newContext({ baseURL: E2E_API_ORIGIN });
    const tenant = await registerTenant(api);
    await api.dispose();
    await use(tenant);
  },

  portalTenant: async ({ tenant }, use) => {
    const api = await request.newContext({ baseURL: E2E_API_ORIGIN });

    const loginResponse = await api.post('/api/auth/login', {
      data: { email: tenant.adminEmail, password: tenant.adminPassword },
    });
    if (!loginResponse.ok()) {
      throw new Error(
        `No se pudo autenticar al admin del tenant de prueba: ${loginResponse.status()} ${await loginResponse.text()}`,
      );
    }

    const suffix = uniqueSuffix();
    const clientFullName = `Cliente Portal E2E ${suffix}`;
    // `email` e `identificationNumber` son opcionales en CreateClientDto pero
    // las columnas `clients.email` y `clients.identification_number` en BD
    // tienen NOT NULL (deuda de esquema, Bug 14 — ver BACKLOG-BUGS.md). El
    // email de aquí es el de contacto del cliente, no el que recibe la
    // invitación al portal (eso lo maneja el spec por separado, vía UI).
    const clientResponse = await api.post('/api/clients', {
      data: {
        fullName: clientFullName,
        email: `cliente.portal.e2e.${suffix}@lexar-test.com`,
        identificationNumber: suffix,
      },
    });
    if (!clientResponse.ok()) {
      throw new Error(
        `No se pudo crear el cliente de prueba: ${clientResponse.status()} ${await clientResponse.text()}`,
      );
    }
    const { client } = (await clientResponse.json()) as { client: { id: string } };

    const legalProcessTitle = `Proceso Portal E2E ${suffix}`;
    const processResponse = await api.post('/api/legal-processes', {
      data: { title: legalProcessTitle, clientId: client.id },
    });
    if (!processResponse.ok()) {
      throw new Error(
        `No se pudo crear el proceso legal de prueba: ${processResponse.status()} ${await processResponse.text()}`,
      );
    }
    const { legalProcess } = (await processResponse.json()) as {
      legalProcess: { id: string };
    };

    await makeProcessCreatedEventVisible(api, legalProcess.id);
    const documentFilename = await uploadVisibleDocument(api, legalProcess.id);

    await api.dispose();

    await use({
      ...tenant,
      clientId: client.id,
      clientFullName,
      legalProcessId: legalProcess.id,
      legalProcessTitle,
      documentFilename,
    });
  },
});

export { expect } from '@playwright/test';
