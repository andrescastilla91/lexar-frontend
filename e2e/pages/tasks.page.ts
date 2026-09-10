import { Locator, Page } from '@playwright/test';

/**
 * Page object para /tareas (F14 — tareas con tablero drag y flujo de
 * aprobación). Selectores por rol/texto visible, sin test-ids, igual que el
 * resto de page objects de este proyecto.
 *
 * El formulario de creación y el de filtros comparten
 * `formcontrolname="processId"` (ver tasks.component.ts) — se escopa el
 * modal de creación a su propio `<form>` (heading "Nueva tarea") igual que
 * se hizo en calendar.page.ts.
 */
export class TasksPage {
  readonly newTaskButton: Locator;
  readonly createForm: Locator;
  readonly createSubmitButton: Locator;
  readonly listViewButton: Locator;
  readonly boardViewButton: Locator;
  readonly approvalsInboxToggle: Locator;
  readonly editButton: Locator;
  /** F28 — modal de `TaskEditModalComponent`: usa `FormModalShellComponent`,
   * cuyo `<h3>` de título vive FUERA del `<form>` proyectado (a diferencia
   * del modal de creación, que es un `<form>` propio con el heading
   * adentro) — por eso se escopa por el contenedor `fixed inset-0`
   * completo, no por `form`. El detalle se cierra antes de abrir este modal
   * (tasks.component.ts: `openEditModal`), así que solo hay un overlay
   * `fixed inset-0` visible a la vez. */
  readonly editModal: Locator;
  readonly editSaveButton: Locator;

  constructor(private readonly page: Page) {
    this.newTaskButton = page.getByRole('button', { name: 'Nueva tarea' });
    this.createForm = page
      .locator('form')
      .filter({ has: page.getByRole('heading', { name: 'Nueva tarea' }) });
    this.createSubmitButton = this.createForm.getByRole('button', { name: 'Crear tarea' });
    this.listViewButton = page.getByRole('button', { name: 'Lista', exact: true });
    this.boardViewButton = page.getByRole('button', { name: 'Tablero', exact: true });
    // El contador de pendientes va pegado al texto ("Aprobaciones
    // pendientes 2") — match parcial por defecto de getByRole cubre ambos
    // casos (con y sin badge).
    this.approvalsInboxToggle = page.getByRole('button', { name: 'Aprobaciones pendientes' });
    this.editButton = page.getByRole('button', { name: 'Editar', exact: true });
    this.editModal = page
      .locator('div.fixed.inset-0')
      .filter({ has: page.getByRole('heading', { name: 'Editar tarea' }) });
    this.editSaveButton = this.editModal.getByRole('button', { name: 'Guardar cambios' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/tareas');
  }

  async openCreateModal(): Promise<void> {
    await this.newTaskButton.click();
  }

  async fillCreateForm(options: { title: string; description?: string }): Promise<void> {
    await this.createForm.locator('input[formcontrolname="title"]').fill(options.title);
    if (options.description) {
      await this.createForm
        .locator('textarea[formcontrolname="description"]')
        .fill(options.description);
    }
  }

  async submitCreate(): Promise<void> {
    await this.createSubmitButton.click();
  }

  async switchToListView(): Promise<void> {
    await this.listViewButton.click();
  }

  async switchToBoardView(): Promise<void> {
    await this.boardViewButton.click();
  }

  /** Fila de la vista de lista (agrupada por vencimiento, no por estado). */
  listTaskRow(title: string): Locator {
    return this.page.locator('button').filter({ hasText: title });
  }

  /** Columna del tablero — el `<h3>` con el label del estado incluye el
   * contador ("Por hacer (2)"), por eso el match es parcial. El contenedor
   * con el listener `(drop)` es el div padre directo del heading. */
  statusColumn(label: string): Locator {
    return this.page
      .locator('div.rounded-lg.border.border-default.bg-surface-muted.p-3')
      .filter({ has: this.page.getByRole('heading', { name: label }) });
  }

  /** Tarjeta arrastrable del tablero — solo las tarjetas sin aprobación
   * pendiente ni estado terminal quedan con `draggable="true"`
   * (isCardLocked() en tasks.component.ts). */
  boardCard(title: string): Locator {
    return this.page.locator('div[draggable="true"]').filter({ hasText: title });
  }

  /** Tarjeta del tablero sin filtrar por draggable — sirve para verificar
   * en qué columna quedó después de moverla, esté o no bloqueada. */
  anyBoardCard(title: string): Locator {
    return this.page
      .locator('div.rounded-md.border.p-3.shadow-card')
      .filter({ hasText: title });
  }

  /**
   * Simula un drag & drop HTML5 nativo siguiendo el patrón recomendado por
   * Playwright para eventos de drag reales (dragTo() no dispara
   * dragstart/drop con un DataTransfer, y el componente escucha esos
   * eventos nativos directamente — ver tasks.component.ts onDragStart/
   * onDrop). El componente además guarda el id arrastrado en un campo de
   * instancia (`draggedTaskId`) apenas se dispara dragstart, así que ni
   * siquiera depende de que el DataTransfer sintético transporte datos
   * reales — con dispararlo antes del drop alcanza.
   */
  async dragTaskToColumn(taskTitle: string, columnLabel: string): Promise<void> {
    const card = this.boardCard(taskTitle);
    const column = this.statusColumn(columnLabel);
    const dataTransfer = await this.page.evaluateHandle(() => new DataTransfer());
    await card.dispatchEvent('dragstart', { dataTransfer });
    await column.dispatchEvent('drop', { dataTransfer });
  }

  async openApprovalsInbox(): Promise<void> {
    await this.approvalsInboxToggle.click();
  }

  /** Abre el panel de detalle desde la vista de lista (mismo botón que
   * `listTaskRow`, dispara `openDetail(task)` en tasks.component.ts). */
  async openDetailFromList(title: string): Promise<void> {
    await this.listTaskRow(title).click();
  }

  async openEditModal(): Promise<void> {
    await this.editButton.click();
  }

  /** F28 — llena el formulario del modal de edición. Los campos vacíos se
   * dejan tal cual (no se limpian) para no depender de cuáles quiere tocar
   * cada test. */
  async fillEditForm(options: {
    title?: string;
    description?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH';
  }): Promise<void> {
    if (options.title !== undefined) {
      await this.editModal.locator('input[formcontrolname="title"]').fill(options.title);
    }
    if (options.description !== undefined) {
      await this.editModal.locator('textarea[formcontrolname="description"]').fill(options.description);
    }
    if (options.priority !== undefined) {
      await this.editModal.locator('select[formcontrolname="priority"]').selectOption(options.priority);
    }
  }

  async submitEdit(): Promise<void> {
    await this.editSaveButton.click();
  }

  approvalItem(taskTitle: string): Locator {
    return this.page.locator('div.rounded-md.border.border-default.bg-surface-muted.p-3').filter({
      hasText: taskTitle,
    });
  }

  async approveRequestFor(taskTitle: string): Promise<void> {
    await this.approvalItem(taskTitle).getByRole('button', { name: 'Aprobar' }).click();
  }

  async rejectRequestFor(taskTitle: string): Promise<void> {
    await this.approvalItem(taskTitle).getByRole('button', { name: 'Rechazar' }).click();
  }
}
