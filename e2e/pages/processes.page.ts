import { Locator, Page } from '@playwright/test';

/**
 * Page object para /procesos: creación/edición de proceso, cambio de estado,
 * anotación con archivo adjunto y descarga desde el historial.
 *
 * Nota de arquitectura (para quien mantenga este spec): a diferencia de
 * Clientes, Procesos NO usa `EntityFilesComponent` — no hay una pestaña de
 * "archivos" en el formulario de proceso. Los documentos solo se adjuntan
 * a través de una anotación (`app-process-annotation-modal`, HU-16) y se
 * descargan/previsualizan desde el historial (`app-process-history-modal`,
 * HU-17). El toggle "compartir con cliente" que expone el historial es a
 * nivel de EVENTO, no de archivo. F27 (2026-09-02) reabrió el "ajuste de
 * alcance" de F16: el toggle ya NO se oculta para ANNOTATION — se rige por
 * la política de visibilidad configurable (ver
 * settings-portal-visibility.page.ts) igual que cualquier otro tipo de
 * evento; solo se oculta cuando el tipo está en modo ALWAYS (entonces se
 * muestra el badge fijo "Siempre visible para el cliente" en su lugar, ver
 * process-history-modal.component.ts).
 *
 * Ajuste 2026-09-21 (F40 Ola 4a — fix e2e tras rediseño de /procesos):
 * el flujo cambió de "todo en modales sobre la lista" a "ficha de detalle
 * dedicada en /procesos/:id con tabs (Datos/Contrapartes/Plazos/Tareas/
 * Historial)". Esto rompió varios supuestos de este page object:
 *  - El modal de creación (`app-process-form`) se recortó a los campos
 *    esenciales — ya NO incluye "Asunto" (matterId), y SÍ agregó "Tipo de
 *    proceso" (processTypeId) como obligatorio. Guardar navega directo a
 *    la ficha de detalle (mismo patrón que clients.component.ts).
 *  - Ya no existe un botón "Editar proceso": la edición es el formulario
 *    inline "Guardar cambios" de la pestaña "Datos" de la ficha — ahí es
 *    donde ahora viven asunto, descripción, juzgado, radicado y fechas.
 *  - Ya no existe un botón "Ver historial": "Historial" es una pestaña más
 *    de la ficha de detalle.
 *  - El título del proceso en la card de la lista dejó de ser un heading
 *    (<h3>) — ahora es un <a [routerLink]> que navega a la ficha (ver
 *    processes-table.component.ts). `processTitleHeading()` sigue siendo
 *    válido, pero solo contra la FICHA DE DETALLE (donde el título sí es
 *    un <h2> real, ver process-detail.component.ts) — contra la lista hay
 *    que usar `processCardTitleLink()` / `openProcessDetail()`.
 */
export class ProcessesPage {
  readonly newProcessButton: Locator;
  readonly titleInput: Locator;
  readonly clientSelect: Locator;
  // F40 Ola 4a: "Tipo de proceso" es obligatorio en el modal de creación
  // (Validators.required en processForm, ver processes.component.ts) —
  // sin seleccionarlo, submitProcess() bloquea el guardado en silencio
  // (el panel de creación se queda abierto con "Completa los campos
  // obligatorios.", nunca navega a la ficha de detalle).
  readonly processTypeSelect: Locator;
  readonly stageSelect: Locator;
  readonly riskLevelSelect: Locator;
  // Mismo botón para crear/actualizar — el texto cambia según isEditing()
  // (ver process-form.component.ts).
  readonly saveProcessButton: Locator;

  // F40 Ola 4a: "Asunto", "Descripción" y "Radicado" ya no están en el
  // modal de creación — viven en el formulario inline de la pestaña
  // "Datos" de la ficha de detalle (`app-process-detail`, editForm). Se
  // escopan a ese componente para no chocar con los <select>/<input>
  // homónimos del modal de creación o de la barra de filtros de la lista.
  private readonly datosTabScope: Locator;
  readonly matterSelect: Locator;
  readonly descriptionInput: Locator;
  readonly caseNumberInput: Locator;
  readonly saveDatosButton: Locator;

  readonly statusSelect: Locator;
  readonly updateStatusButton: Locator;

  readonly annotationDescriptionInput: Locator;
  readonly annotationFileInput: Locator;
  readonly saveAnnotationButton: Locator;
  // F27: solo existe en el DOM cuando la política de ANNOTATION está en
  // DEFAULT_ON (nace visible) — ver `@if (isVisibleByDefault())` en
  // process-annotation-modal.component.ts.
  readonly annotationMarkInternalCheckbox: Locator;

  // F41 (ola 4, rediseño 2026-09-23): pestaña "Plazos" de la ficha —
  // listado (`app-process-deadlines-list`) + modal de alta compartido con
  // Calendario (`app-deadline-form-modal`, sin el selector de Proceso: ver
  // showProcessField=false en process-detail.component.ts). La edición ya
  // no vive aquí — "Editar plazo" navega a /calendario/plazos/:id (ver
  // DeadlineDetailPage).
  private readonly plazosListScope: Locator;
  readonly newPlazoButton: Locator;
  private readonly plazoFormScope: Locator;
  readonly plazoTitleInput: Locator;
  readonly plazoTypeSelect: Locator;
  readonly plazoDueAtInput: Locator;
  readonly plazoSubmitButton: Locator;

  constructor(private readonly page: Page) {
    this.newProcessButton = this.page.getByRole('button', { name: 'Nuevo proceso' });
    // Escopados a <app-process-form> (el modal de crear/editar): la barra de
    // filtros de la lista tiene su propio <select formControlName="clientId">
    // (y su propio "Tipo de proceso") siempre presentes en el DOM, y sin
    // este scope los selects matchean por duplicado (violación de modo
    // estricto de Playwright) — ver processes.component.ts línea ~151
    // (filtro) vs línea ~422 (processForm del modal).
    const formScope = this.page.locator('app-process-form');
    this.titleInput = formScope.locator('input[formcontrolname="title"]');
    this.clientSelect = formScope.locator('select[formcontrolname="clientId"]');
    this.processTypeSelect = formScope.locator('select[formcontrolname="processTypeId"]');
    this.stageSelect = formScope.locator('select[formcontrolname="stageId"]');
    this.riskLevelSelect = formScope.locator('select[formcontrolname="riskLevelId"]');
    this.saveProcessButton = this.page.getByRole('button', { name: /^(Guardar|Actualizar) proceso$/ });

    this.datosTabScope = this.page.locator('app-process-detail');
    this.matterSelect = this.datosTabScope.locator('select[formcontrolname="matterId"]');
    // F40 §PRO-08 (ola 4b): description pasó de <textarea> a <ngx-editor>
    // (ProseMirror) — el elemento editable real es el div .NgxEditor__Content
    // que ProseMirror monta dentro del host <ngx-editor>, no el host mismo.
    this.descriptionInput = this.datosTabScope.locator(
      'ngx-editor[formcontrolname="description"] .NgxEditor__Content',
    );
    this.caseNumberInput = this.datosTabScope.locator('input[formcontrolname="caseNumber"]');
    this.saveDatosButton = this.datosTabScope.getByRole('button', { name: 'Guardar cambios' });

    // Escopados a <app-process-status-modal>: la barra de filtros de la
    // lista tiene su propio <select formControlName="status"> ("Estado:
    // Todos/Borrador/Activo/..."), siempre presente en el DOM — mismo
    // gotcha que clientSelect arriba (ver processes.component.ts línea
    // ~133 vs process-status-modal.component.ts línea ~24).
    const statusModalScope = this.page.locator('app-process-status-modal');
    this.statusSelect = statusModalScope.locator('select[formcontrolname="status"]');
    this.updateStatusButton = statusModalScope.getByRole('button', { name: 'Actualizar estado' });

    // F40 Ola 4a: escopado a <app-process-annotation-modal> — la pestaña
    // "Datos" de la ficha tiene su propio <ngx-editor formcontrolname=
    // "description"> (activeTab() arranca en 'datos', así que convive en
    // el DOM con el overlay de anotación en cuanto este se abre) — sin
    // este scope, fill() choca con 2 elementos (violación de modo estricto).
    const annotationModalScope = this.page.locator('app-process-annotation-modal');
    this.annotationDescriptionInput = annotationModalScope.locator(
      'ngx-editor[formcontrolname="description"] .NgxEditor__Content',
    );
    this.annotationFileInput = this.page.locator('input[type="file"]');
    this.saveAnnotationButton = this.page.getByRole('button', { name: 'Guardar anotación' });
    this.annotationMarkInternalCheckbox = annotationModalScope.getByLabel(
      'Marcar como interna (no visible para el cliente)',
    );

    this.plazosListScope = this.page.locator('app-process-deadlines-list');
    this.newPlazoButton = this.plazosListScope.getByRole('button', { name: 'Nuevo plazo' });
    // Heading "Nuevo plazo" a secas (sin "o audiencia"/"evento general")
    // solo ocurre cuando showProcessField()=false — ver
    // DeadlineFormModalComponent, distinto del modal de Calendario.
    this.plazoFormScope = this.page
      .locator('form')
      .filter({ has: this.page.getByRole('heading', { name: 'Nuevo plazo', exact: true }) });
    this.plazoTitleInput = this.plazoFormScope.locator('input[formcontrolname="title"]');
    this.plazoTypeSelect = this.plazoFormScope.locator('select[formcontrolname="typeId"]');
    this.plazoDueAtInput = this.plazoFormScope.locator('input[formcontrolname="dueAt"]');
    this.plazoSubmitButton = this.plazoFormScope.getByRole('button', { name: 'Crear plazo' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/procesos');
  }

  // Buscador de "Asesores responsables" dentro del modal (MultiSelectComponent,
  // ajuste 2026-09-03: la lista de opciones ya no está siempre visible, se
  // abre al enfocar el input, igual que un <select>).
  //
  // getByRole en vez de getByPlaceholder: el `placeholder="Buscar asesor…"`
  // que process-form.component.ts pasa como atributo estático a
  // <app-multi-select> queda reflejado también en el custom element host
  // (no solo en el <input> interno), así que getByPlaceholder resolvía a 2
  // elementos ("strict mode violation"). role=combobox solo lo tiene el
  // <input> real.
  advisorSearchInput(): Locator {
    return this.page
      .locator('app-process-form')
      .getByRole('combobox', { name: 'Asesores responsables' });
  }

  // Checkbox de un asesor dentro del listbox — filtrado por el nombre
  // visible (`advisor.user.firstName + lastName`, ver process-form.component.ts).
  // Necesario porque un proceso ACTIVE exige al menos un asesor asignado
  // (`legal-processes.service.ts`: "No se puede activar un proceso sin al
  // menos un asesor asignado."), y un tenant recién registrado no tiene
  // ningún Advisor por defecto. Requiere que el listbox esté abierto (ver
  // advisorSearchInput()) para ser visible/interactuable.
  advisorCheckbox(advisorFullName: string): Locator {
    return this.page
      .locator('app-process-form')
      .locator('label')
      .filter({ hasText: advisorFullName })
      .locator('input[type="checkbox"]');
  }

  async createProcess(data: {
    title: string;
    clientFullName: string;
    processTypeLabel: string;
    stageLabel: string;
    riskLevelLabel: string;
    advisorFullName?: string;
  }): Promise<void> {
    await this.newProcessButton.click();
    await this.titleInput.fill(data.title);
    await this.clientSelect.selectOption({ label: data.clientFullName });
    // processTypeId y stageId y riskLevelId son obligatorios a nivel de
    // FormGroup (Validators.required en processForm) aunque el template no
    // lo marque con "*" para todos — sin esto, submitProcess() bloquea el
    // guardado en silencio (solo un mensaje de error, el panel no navega a
    // la ficha). Ver processes.component.ts.
    await this.processTypeSelect.selectOption({ label: data.processTypeLabel });
    await this.stageSelect.selectOption({ label: data.stageLabel });
    await this.riskLevelSelect.selectOption({ label: data.riskLevelLabel });
    if (data.advisorFullName) {
      // Abre el listbox del multi-select (ajuste 2026-09-03: cerrado por
      // defecto, se abre al enfocar el buscador) antes de poder marcar el
      // checkbox del asesor.
      await this.advisorSearchInput().click();
      await this.advisorCheckbox(data.advisorFullName).check();
    }
    await this.saveProcessButton.click();
  }

  // F34 §3 (reescrito F40 Ola 4a): "Asunto" ya no se elige al crear el
  // proceso — se vincula después, desde el <select formcontrolname=
  // "matterId"> de la pestaña "Datos" de la ficha de detalle, y hay que
  // guardar explícitamente (ya no es parte de un único submit de creación).
  // Esperamos a que la opción exista porque matters() se recarga
  // asíncronamente vía ClientsService.getMatters() (ver
  // process-detail.component.ts).
  //
  // BUG QA 2026-09-17 (e2e real, no del código de producto): waitFor() sin
  // `state` espera 'visible' por defecto, y Playwright/Chromium calculan la
  // geometría de un <option> dentro de un <select> CERRADO como oculta (no
  // hay bounding box real hasta que el dropdown nativo se abre) — el propio
  // error-context.md de la corrida en rojo muestra el <option> ya presente
  // con el texto correcto en el árbol de accesibilidad, solo que nunca
  // "visible" en 30s. Lo único que este wait necesita garantizar es que la
  // opción ya EXISTE en el DOM (que matters() terminó de cargar) — no que
  // esté pintada, algo que selectOption() no requiere (actúa sobre el value,
  // no sobre clicks reales). state: 'attached' expresa esa precondición real
  // sin depender del cálculo de visibilidad, inconsistente para <option>.
  async linkMatter(matterName: string): Promise<void> {
    await this.matterSelect.locator('option', { hasText: matterName }).waitFor({ state: 'attached' });
    await this.matterSelect.selectOption({ label: matterName });
    await this.saveDatosButton.click();
    await this.page.getByText('Proceso actualizado exitosamente').waitFor({ state: 'visible', timeout: 15_000 });
  }

  changeStatusButton(): Locator {
    return this.page.getByRole('button', { name: 'Cambiar estado' });
  }

  annotateButton(): Locator {
    return this.page.getByRole('button', { name: 'Agregar anotación' });
  }

  // caseNumber se edita (en vez de court) porque es el único campo del
  // formulario que también se renderiza en la card de la lista (bajo el
  // título, ver processes-table.component.ts) — permite verificar la
  // edición sin reabrir el modal.
  //
  // F40 Ola 4a: ya no hay un botón "Editar proceso" — el <input
  // formcontrolname="caseNumber"> de la pestaña "Datos" (activa por
  // defecto en la ficha de detalle) es editable directamente; se guarda
  // con "Guardar cambios" en vez de reabrir un modal.
  async editCaseNumber(newCaseNumber: string): Promise<void> {
    await this.caseNumberInput.fill(newCaseNumber);
    await this.saveDatosButton.click();
    await this.page.getByText('Proceso actualizado exitosamente').waitFor({ state: 'visible', timeout: 15_000 });
  }

  async changeStatusTo(statusLabel: string): Promise<void> {
    await this.changeStatusButton().click();
    await this.statusSelect.selectOption({ label: statusLabel });
    await this.updateStatusButton.click();

    // El modal se queda abierto mostrando errorMessage() si el backend
    // rechaza la transición (ej. "No se puede activar un proceso sin al
    // menos un asesor asignado.") — sin esta verificación, el test seguía
    // de largo y fallaba varios pasos después con un timeout confuso
    // esperando un elemento que nunca aparece porque el estado nunca
    // cambió. Falla aquí mismo, con el mensaje real del backend.
    const statusModal = this.page.locator('app-process-status-modal');
    try {
      await statusModal.waitFor({ state: 'hidden', timeout: 5_000 });
    } catch {
      const errorText = await statusModal.locator('.text-danger, .border-danger').first().textContent();
      throw new Error(
        `El modal de cambio de estado no se cerró tras "Actualizar estado"` +
          (errorText ? ` — mensaje de error: ${errorText.trim()}` : ' (sin mensaje de error visible).'),
      );
    }
  }

  async addAnnotationWithFile(description: string, filePath: string): Promise<void> {
    await this.annotateButton().click();
    await this.annotationDescriptionInput.fill(description);
    // setInputFiles no requiere que el input sea visible (está oculto con
    // `.hidden`, ver process-annotation-modal.component.ts) — a diferencia
    // de click(), esta acción de Playwright sí tolera inputs ocultos.
    await this.annotationFileInput.setInputFiles(filePath);
    await this.saveAnnotationButton.click();
    await this.waitForAnnotationModalToClose();
  }

  // F27: crea una anotación sin archivo adjunto — usada para probar la
  // política de visibilidad (DEFAULT_ON con/sin "marcar interna"), donde el
  // archivo no aporta nada al caso y solo añade tiempo de ejecución.
  async addAnnotation(description: string, options: { markAsInternal?: boolean } = {}): Promise<void> {
    await this.annotateButton().click();
    await this.annotationDescriptionInput.fill(description);
    if (options.markAsInternal) {
      await this.annotationMarkInternalCheckbox.check();
    }
    await this.saveAnnotationButton.click();
    await this.waitForAnnotationModalToClose();
  }

  private async waitForAnnotationModalToClose(): Promise<void> {
    // <app-process-annotation-modal> está montado sin condición en
    // process-detail.component.ts — el tag host nunca se desmonta, solo su
    // contenido (el overlay `fixed inset-0`) vía `@if (isOpen())` dentro de
    // su propio template. Esperar `state: 'hidden'` sobre el host es una
    // heurística de bounding-box, no una prueba dura de que el overlay salió
    // del DOM, y bajo carga (suite completa) se demostró insuficiente: el
    // wait resolvía pero el siguiente click seguía chocando contra el mismo
    // overlay. Se reemplaza por dos señales duras: 1) el toast de éxito
    // (prueba de negocio de que create+upload terminaron), 2) `state:
    // 'detached'` sobre el overlay real, que exige que el nodo desaparezca
    // del DOM de verdad.
    const annotationModal = this.page.locator('app-process-annotation-modal');
    const annotationOverlay = annotationModal.locator('div.fixed.inset-0');
    try {
      await this.page
        .getByText('Anotación creada correctamente.')
        .waitFor({ state: 'visible', timeout: 15_000 });
      await annotationOverlay.waitFor({ state: 'detached', timeout: 20_000 });
    } catch {
      const errorText = await annotationModal
        .locator('.text-danger, .border-danger')
        .first()
        .textContent()
        .catch(() => null);
      throw new Error(
        `El modal de anotación no se cerró tras "Guardar anotación"` +
          (errorText ? ` — mensaje de error: ${errorText.trim()}` : ' (sin mensaje de error visible).'),
      );
    }
  }

  downloadAttachmentButton(): Locator {
    return this.page.getByRole('button', { name: 'Descargar archivo' });
  }

  // BUG-13 (hallazgo post-cierre): previsualizar carga la URL prefirmada
  // (R2/MinIO) en un <iframe [src]> — a diferencia de "Descargar archivo"
  // (abre en pestaña nueva), esto SÍ requiere `frame-src` en la CSP. El botón
  // vive en app-process-history-modal (title="Ver archivo", ver
  // process-history-modal.component.ts).
  previewFileButton(): Locator {
    return this.page.getByRole('button', { name: 'Ver archivo' });
  }

  previewModalIframe(): Locator {
    return this.page.locator('app-file-preview-modal iframe');
  }

  closePreviewButton(): Locator {
    return this.page.locator('app-file-preview-modal').getByRole('button', { name: 'Cerrar' });
  }

  // F40 Ola 4a: "Historial" dejó de ser un botón/modal independiente
  // ("Ver historial") y pasó a ser una pestaña más de la ficha de detalle
  // (`tabs` en process-detail.component.ts) — se abre haciendo click en la
  // pestaña, no en un botón dedicado.
  async openHistory(): Promise<void> {
    await this.datosTabScope
      .locator('nav')
      .getByRole('button', { name: 'Historial', exact: true })
      .click();
  }

  // F27: fila del historial para un evento, acotada por su descripción —
  // necesaria para leer el badge/botón de visibilidad de ESE evento
  // puntual (varios eventos comparten el mismo `getEventLabel()`, ej. dos
  // "Cambio de estado", así que no basta con filtrar por el tipo).
  historyEventRow(description: string | RegExp): Locator {
    return this.page.locator('app-process-history-modal .flex.gap-4').filter({ hasText: description });
  }

  historyAlwaysVisibleBadge(description: string | RegExp): Locator {
    return this.historyEventRow(description).getByText('Siempre visible para el cliente', { exact: true });
  }

  historyVisibilityToggle(description: string | RegExp): Locator {
    return this.historyEventRow(description).locator('button[title*="visible"]');
  }

  // La card de escritorio (`p-6 shadow-card`) y la card mobile (`p-4
  // shadow-card`, oculta con `md:hidden` pero igual presente en el DOM)
  // repiten el mismo título — un getByText/getByRole suelto sobre toda la
  // página matchea las dos y viola modo estricto (mismo gotcha de
  // settings-catalogs.page.ts / clients.page.ts). Se acota a la card de
  // escritorio por su clase distintiva (`p-6`, la mobile usa `p-4`) en vez
  // de depender del rol/visibilidad calculada.
  processTitleHeading(title: string): Locator {
    return this.page.getByRole('heading', { name: title, exact: true });
  }

  // F40 Ola 4a: el título de la card en la LISTA ya no es un heading — es
  // un <a [routerLink]="['/procesos', process.id]"> que navega a la ficha
  // de detalle (ver processes-table.component.ts). `processTitleHeading()`
  // solo es válido dentro de la ficha de detalle (`<h2>` real, ver
  // process-detail.component.ts); en la lista hay que usar este locator.
  processCardTitleLink(title: string): Locator {
    return this.page.locator('div.p-6.shadow-card').getByRole('link', { name: title, exact: true });
  }

  // Navega desde la lista a la ficha de detalle de un proceso, haciendo
  // click en el título de su card.
  async openProcessDetail(title: string): Promise<void> {
    await this.processCardTitleLink(title).click();
  }

  processCard(title: string): Locator {
    return this.page.locator('div.p-6.shadow-card').filter({ has: this.processCardTitleLink(title) });
  }

  // F41 (ola 4, rediseño 2026-09-23): abre la pestaña "Plazos" de la ficha
  // de detalle (mismo patrón que openHistory() para "Historial").
  async openPlazosTab(): Promise<void> {
    await this.datosTabScope
      .locator('nav')
      .getByRole('button', { name: 'Plazos', exact: true })
      .click();
  }

  // Crea un plazo desde la pestaña "Plazos" — el proceso ya es fijo
  // (showProcessField=false en DeadlineFormModalComponent), así que a
  // diferencia de CalendarPage.fillCreateForm() no hay selector de
  // Proceso que elegir. Al enviar, la app navega a la ficha del plazo
  // (/calendario/plazos/:id?returnTo=proceso&processId=...&tab=plazos).
  async createPlazo(data: { title: string; typeLabel: string; dueAt: string }): Promise<void> {
    await this.newPlazoButton.click();
    await this.plazoTitleInput.fill(data.title);
    await this.plazoTypeSelect.selectOption({ label: data.typeLabel });
    await this.plazoDueAtInput.fill(data.dueAt);
    await this.plazoSubmitButton.click();
  }

  deadlineRow(title: string): Locator {
    return this.plazosListScope.locator('div.rounded-lg.border.border-default.bg-surface.p-3').filter({
      hasText: title,
    });
  }
}
