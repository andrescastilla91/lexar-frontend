import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientsService } from '../../../../core/services/clients.service';
import { CatalogsService } from '../../../../core/services/catalogs.service';
import { ClientMatterResponse, ClientMatterStatus } from '../../../../core/models/client-backend.model';
import { CatalogItem } from '../../../../core/models/catalog-backend.model';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';

/** F34 §2: vigencia visible en la lista de asuntos. */
function matterStatusLabel(status: ClientMatterStatus): string {
  switch (status) {
    case ClientMatterStatus.VIGENTE:
      return 'Vigente';
    case ClientMatterStatus.VENCIDO:
      return 'Vencido';
    case ClientMatterStatus.TERMINADO:
      return 'Terminado';
    default:
      return status;
  }
}

function matterStatusClasses(status: ClientMatterStatus): string {
  switch (status) {
    case ClientMatterStatus.VIGENTE:
      return 'bg-success-tint text-success';
    case ClientMatterStatus.VENCIDO:
      return 'bg-danger-tint text-danger';
    case ClientMatterStatus.TERMINADO:
      return 'bg-surface-muted text-subtle';
    default:
      return 'bg-surface-muted text-muted';
  }
}

/**
 * F34 §2/§4: pestaña Asuntos de la ficha del cliente. CRUD completo contra
 * `client-matters`, reutiliza `clients.view`/`clients.edit` (mismo patrón de
 * sub-recurso que ClientContactsPanelComponent en F33 — sin permisos
 * nuevos). La vigencia (VIGENTE/VENCIDO) la calcula siempre el backend; el
 * único estado que se edita desde aquí es el cierre anticipado (TERMINADO).
 */
@Component({
  selector: 'app-client-matters-panel',
  standalone: true,
  imports: [ReactiveFormsModule, HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface shadow-card">
      <div class="flex items-center justify-between border-b border-default p-4">
        <h3 class="text-sm font-semibold text-text">Asuntos ({{ matters().length }})</h3>
        <button
          *hasPermission="'clients.edit'"
          type="button"
          (click)="openCreateForm()"
          class="rounded-md bg-navy-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-950"
        >
          + Agregar asunto
        </button>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else if (matters().length === 0) {
        <p class="p-6 text-sm text-subtle">Este cliente no tiene asuntos registrados.</p>
      } @else {
        <ul class="divide-y divide-default">
          @for (matter of matters(); track matter.id) {
            <li class="flex items-start justify-between gap-4 p-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-medium text-text">{{ matter.name }}</p>
                  <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold" [class]="matterStatusClasses(matter.status)">
                    {{ matterStatusLabel(matter.status) }}
                  </span>
                </div>
                <p class="text-xs text-subtle">{{ matter.contractType?.label || 'Sin tipo de vinculación' }}</p>
                @if (matter.description) {
                  <p class="mt-1 text-xs text-muted">{{ matter.description }}</p>
                }
                <p class="mt-1 text-xs text-muted">
                  {{ matter.startDate ? formatDate(matter.startDate) : 'Sin fecha de inicio' }}
                  &middot;
                  {{ matter.endDate ? formatDate(matter.endDate) : 'Sin fecha de fin' }}
                  &middot;
                  {{ matter.processCount }} proceso(s) vinculado(s)
                </p>
              </div>
              <div class="flex shrink-0 gap-2">
                @if (matter.status !== 'TERMINADO') {
                  <button
                    *hasPermission="'clients.edit'"
                    type="button"
                    (click)="closeEarly(matter)"
                    class="rounded-lg p-2 text-subtle hover:bg-surface-muted hover:text-text"
                    title="Cerrar anticipadamente"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </button>
                }
                <button
                  *hasPermission="'clients.edit'"
                  type="button"
                  (click)="openEditForm(matter)"
                  class="rounded-lg p-2 text-subtle hover:bg-surface-muted hover:text-text"
                  title="Editar"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                  </svg>
                </button>
                <button
                  *hasPermission="'clients.edit'"
                  type="button"
                  (click)="remove(matter)"
                  [disabled]="matter.processCount > 0"
                  class="rounded-lg p-2 text-danger hover:bg-danger-tint disabled:cursor-not-allowed disabled:text-subtle disabled:hover:bg-transparent"
                  [title]="matter.processCount > 0 ? 'No se puede eliminar: tiene procesos vinculados. Usa Cerrar anticipadamente en su lugar.' : 'Eliminar'"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </li>
          }
        </ul>
      }
    </div>

    @if (isFormOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div class="w-full max-w-md rounded-lg border border-default bg-surface p-6 shadow-2xl">
          <h3 class="mb-4 text-lg font-semibold text-text">
            {{ editingMatterId() ? 'Editar asunto' : 'Nuevo asunto' }}
          </h3>
          <form [formGroup]="form" (ngSubmit)="save()" class="space-y-4">
            <label class="block text-sm text-muted">
              Nombre *
              <input
                formControlName="name"
                type="text"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <label class="block text-sm text-muted">
              Tipo de vinculación
              <select
                formControlName="contractTypeId"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option value="">Sin definir</option>
                @for (contractType of contractTypes(); track contractType.id) {
                  <option [value]="contractType.id">{{ contractType.label }}</option>
                }
              </select>
            </label>
            <label class="block text-sm text-muted">
              Descripción
              <textarea
                formControlName="description"
                rows="2"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              ></textarea>
            </label>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="text-sm text-muted">
                Fecha de inicio
                <input
                  formControlName="startDate"
                  type="date"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
              <label class="text-sm text-muted">
                Fecha de fin
                <input
                  formControlName="endDate"
                  type="date"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
            </div>

            @if (errorMessage()) {
              <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
                {{ errorMessage() }}
              </div>
            }

            <div class="flex gap-3">
              <button
                type="button"
                (click)="closeForm()"
                class="flex-1 rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="flex-1 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
                [disabled]="isSaving() || form.invalid"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class ClientMattersPanelComponent implements OnInit {
  clientId = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly clientsService = inject(ClientsService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  readonly matters = signal<ClientMatterResponse[]>([]);
  readonly contractTypes = signal<CatalogItem[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isFormOpen = signal(false);
  readonly editingMatterId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    contractTypeId: [''],
    description: [''],
    startDate: [''],
    endDate: [''],
  });

  ngOnInit(): void {
    this.catalogsService.getActiveCatalog('contract_type').subscribe((items) => this.contractTypes.set(items));
    this.loadMatters();
  }

  private loadMatters(): void {
    this.isLoading.set(true);
    this.clientsService.getMatters(this.clientId()).subscribe({
      next: (matters) => {
        this.matters.set(matters);
        this.isLoading.set(false);
      },
      error: () => {
        this.matters.set([]);
        this.isLoading.set(false);
      },
    });
  }

  openCreateForm(): void {
    this.editingMatterId.set(null);
    this.errorMessage.set(null);
    this.form.reset({ name: '', contractTypeId: '', description: '', startDate: '', endDate: '' });
    this.isFormOpen.set(true);
  }

  openEditForm(matter: ClientMatterResponse): void {
    this.editingMatterId.set(matter.id);
    this.errorMessage.set(null);
    this.form.reset({
      name: matter.name,
      contractTypeId: matter.contractType?.id || '',
      description: matter.description || '',
      startDate: matter.startDate ? matter.startDate.slice(0, 10) : '',
      endDate: matter.endDate ? matter.endDate.slice(0, 10) : '',
    });
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();
    const editingId = this.editingMatterId();

    const request$ = editingId
      ? this.clientsService.updateMatter(editingId, {
          name: value.name,
          contractTypeId: value.contractTypeId || undefined,
          description: value.description || undefined,
          startDate: value.startDate || undefined,
          endDate: value.endDate || undefined,
        })
      : this.clientsService.createMatter({
          clientId: this.clientId(),
          name: value.name,
          contractTypeId: value.contractTypeId || undefined,
          description: value.description || undefined,
          startDate: value.startDate || undefined,
          endDate: value.endDate || undefined,
        });

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isFormOpen.set(false);
        this.toast.success(editingId ? 'Asunto actualizado exitosamente' : 'Asunto creado exitosamente');
        this.loadMatters();
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al guardar asunto');
        this.isSaving.set(false);
      },
    });
  }

  async closeEarly(matter: ClientMatterResponse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Cerrar asunto anticipadamente',
      message: `¿Marcar "${matter.name}" como terminado antes de su fecha de fin?`,
      confirmLabel: 'Cerrar asunto',
    });
    if (!confirmed) {
      return;
    }

    this.clientsService.updateMatter(matter.id, { status: ClientMatterStatus.TERMINADO }).subscribe({
      next: () => {
        this.toast.success('Asunto cerrado exitosamente');
        this.loadMatters();
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al cerrar el asunto');
      },
    });
  }

  async remove(matter: ClientMatterResponse): Promise<void> {
    // BUG-27 (ajuste 2026-09-17, decisión del propietario): un asunto con
    // procesos vinculados no se elimina — se cierra anticipadamente. El
    // botón ya queda deshabilitado en el template para este caso; esta
    // guardia es una segunda defensa (por si el estado del botón queda
    // desactualizado un instante, p. ej. justo tras crear un proceso desde
    // otra pestaña) y evita abrir un diálogo de confirmación que el
    // backend terminaría rechazando de todas formas.
    if (matter.processCount > 0) {
      this.toast.error(
        'No se puede eliminar un asunto con procesos vinculados. Ciérralo anticipadamente en su lugar.',
      );
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar asunto',
      message: `¿Eliminar el asunto "${matter.name}"? Solo se puede eliminar porque no tiene procesos vinculados.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.clientsService.removeMatter(matter.id).subscribe({
      next: () => {
        this.toast.success('Asunto eliminado exitosamente');
        this.loadMatters();
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al eliminar asunto');
      },
    });
  }

  formatDate(date: string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected readonly matterStatusLabel = matterStatusLabel;
  protected readonly matterStatusClasses = matterStatusClasses;
}
