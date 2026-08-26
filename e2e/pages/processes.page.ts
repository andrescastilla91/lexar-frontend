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
 * nivel de EVENTO, no de archivo, y el propio template lo oculta para
 * eventos ANNOTATION (ver `@if (event.type !== eventTypes.ANNOTATION)` en
 * process-history-modal.component.ts) — el backend además lo rechaza
 * explícitamente para ese tipo de evento (comentario en
 * ProcessEventsService.setEventVisibility). Es decir: hoy no existe un
 * camino de UI para des-compartir un documento adjunto a un proceso, así
 * que este page object no expone esa acción — ver el spec para el detalle.
 */
export class ProcessesPage {
  readonly newProcessButton: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly clientSelect: Locator;
  readonly stageSelect: Locator;
  readonly riskLevelSelect: Locator;
  readonly caseNumberInput: Locator;
  // Mismo botón para crear/actualizar — el texto cambia según isEditing()
  // (ver process-form.component.ts).
  readonly saveProcessButton: Locator;

  readonly statusSelect: Locator;
  readonly updateStatusButton: Locator;

  readonly annotationDescriptionInput: Locator;
  readonly annotationFileInput: Locator;
  readonly saveAnnotationButton: Locator;

  readonly closeHistoryButton: Locator;

  constructor(private readonly page: Page) {
    this.newProcessButton = this.page.getByRole('button', { name: 'Nuevo proceso' });
    // Escopados a <app-process-form> (el modal de crear/editar): la barra de
    // filtros de la lista tiene su propio <select formControlName="clientId">
    // siempre presente en el DOM, y sin este scope ambos selects matchean
    // (violación de modo estricto de Playwright) — ver processes.component.ts
    // línea ~151 (filtro) vs línea ~422 (processForm del modal).
    const formScope = this.page.locator('app-process-form');
    this.titleInput = formScope.locator('input[formcontrolname="title"]');
    this.descriptionInput = formScope.locator('textarea[formcontrolname="description"]');
    this.clientSelect = formScope.locator('select[formcontrolname="clientId"]');
    this.stageSelect = formScope.locator('select[formcontrolname="stageId"]');
    this.riskLevelSelect = formScope.locator('select[formcontrolname="riskLevelId"]');
    this.caseNumberInput = formScope.locator('input[formcontrolname="caseNumber"]');
    this.saveProcessButton = this.page.getByRole('button', { name: /^(Guardar|Actualizar) proceso$/ });

    // Escopados a <app-process-status-modal>: la barra de filtros de la
    // lista tiene su propio <select formControlName="status"> ("Estado:
    // Todos/Borrador/Activo/..."), siempre presente en el DOM — mismo
    // gotcha que clientSelect arriba (ver processes.component.ts línea
    // ~133 vs process-status-modal.component.ts línea ~24).
    const statusModalScope = this.page.locator('app-process-status-modal');
    this.statusSelect = statusModalScope.locator('select[formcontrolname="status"]');
    this.updateStatusButton = statusModalScope.getByRole('button', { name: 'Actualizar estado' });

    this.annotationDescriptionInput = this.page.locator('textarea[formcontrolname="description"]');
    this.annotationFileInput = this.page.locator('input[type="file"]');
    this.saveAnnotationButton = this.page.getByRole('button', { name: 'Guardar anotación' });

    this.closeHistoryButton = this.page.getByRole('button', { name: 'Cerrar' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/procesos');
  }

  // Checkbox de "Asesores responsables" dentro del modal — filtrado por el
  // nombre visible (`advisor.user.firstName + lastName`, ver
  // process-form.component.ts). Necesario porque un proceso ACTIVE exige al
  // menos un asesor asignado (`legal-processes.service.ts`: "No se puede
  // activar un proceso sin al menos un asesor asignado."), y un tenant recién
  // registrado no tiene ningún Advisor por defecto.
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
    stageLabel: string;
    riskLevelLabel: string;
    advisorFullName?: string;
  }): Promise<void> {
    await this.newProcessButton.click();
    await this.titleInput.fill(data.title);
    await this.clientSelect.selectOption({ label: data.clientFullName });
    // stageId y riskLevelId son obligatorios a nivel de FormGroup
    // (Validators.required en processForm) aunque el template no lo marque
    // con "*" — sin esto, submitProcess() bloquea el guardado en silencio
    // (solo un mensaje de error, el modal no se cierra). Ver
    // processes.component.ts.
    await this.stageSelect.selectOption({ label: data.stageLabel });
    await this.riskLevelSelect.selectOption({ label: data.riskLevelLabel });
    if (data.advisorFullName) {
      await this.advisorCheckbox(data.advisorFullName).check();
    }
    await this.saveProcessButton.click();
  }

  // Card de escritorio: title="Editar proceso" es el nombre accesible del
  // botón (sin texto visible, ver processes-table.component.ts). La versión
  // mobile del mismo botón usa el texto "Editar" — nombre distinto, así que
  // no hay ambigüedad en el viewport desktop que usa este proyecto.
  editProcessButton(): Locator {
    return this.page.getByRole('button', { name: 'Editar proceso' });
  }

  changeStatusButton(): Locator {
    return this.page.getByRole('button', { name: 'Cambiar estado' });
  }

  viewHistoryButton(): Locator {
    return this.page.getByRole('button', { name: 'Ver historial' });
  }

  annotateButton(): Locator {
    return this.page.getByRole('button', { name: 'Agregar anotación' });
  }

  // caseNumber se edita (en vez de court) porque es el único campo del
  // formulario que también se renderiza en la card de la lista (bajo el
  // título, ver processes-table.component.ts) — permite verificar la
  // edición sin reabrir el modal.
  async editCaseNumber(newCaseNumber: string): Promise<void> {
    await this.editProcessButton().click();
    await this.caseNumberInput.fill(newCaseNumber);
    await this.saveProcessButton.click();
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

    // <app-process-annotation-modal> está montado sin condición en
    // processes.component.ts — el tag host nunca se desmonta, solo su
    // contenido (el overlay `fixed inset-0`) vía `@if (isOpen())` dentro de
    // su propio template. Esperar `state: 'hidden'` sobre el host es una
    // heurística de bounding-box, no una prueba dura de que el overlay salió
    // del DOM, y bajo carga (suite completa) se demostró insuficiente: el
    // wait resolvía pero el siguiente click ("Ver historial") seguía
    // chocando contra el mismo overlay. Se reemplaza por dos señales duras:
    // 1) el toast de éxito (prueba de negocio de que create+upload
    //    terminaron), 2) `state: 'detached'` sobre el overlay real, que
    // exige que el nodo desaparezca del DOM de verdad.
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

  async openHistory(): Promise<void> {
    await this.viewHistoryButton().click();
  }

  // La card de escritorio (`p-6 shadow-card`) y la card mobile (`p-4
  // shadow-card`, oculta con `md:hidden` pero igual presente en el DOM)
  // repiten el mismo título — un getByText suelto sobre toda la página
  // matchea las dos y viola modo estricto (mismo gotcha de
  // settings-catalogs.page.ts / clients.page.ts). El título de escritorio
  // es un <h3> (heading); el de mobile es un <p> sin rol — por eso
  // getByRole('heading', ...) ya alcanza para desambiguar el título solo.
  // Para acotar OTRO texto (ej. caseNumber, que en ambas versiones es un
  // <p>) hay que escopar a la card completa con este helper.
  processTitleHeading(title: string): Locator {
    return this.page.getByRole('heading', { name: title, exact: true });
  }

  processCard(title: string): Locator {
    return this.page.locator('div.p-6.shadow-card').filter({ has: this.processTitleHeading(title) });
  }
}
