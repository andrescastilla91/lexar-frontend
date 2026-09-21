import { ChangeDetectionStrategy, Component, OnChanges, SimpleChanges, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LegalProcessesService } from '../../../core/services/legal-processes.service';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { ProcessCounterpartyResponse } from '../../../core/models/legal-process.model';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import { ClientPersonType } from '../../../core/models/client-backend.model';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';

type CounterpartiesModalTab = 'list' | 'form';

/**
 * F40 §PRO-07/§CLI-12: modal "Contrapartes" de un proceso. Autocontenido
 * (hace sus propias llamadas a `LegalProcessesService`/`CatalogsService`,
 * como `ClientMattersPanelComponent` en F34) en vez del patrón "dumb"
 * input/output de `ProcessTasksModalComponent` — /procesos no tiene una
 * ficha de detalle propia donde vivir un panel como el de Asuntos, así que
 * este componente reemplaza esa ficha para este único sub-recurso. Un
 * proceso puede tener varias contrapartes (Decisión de modelo, F40.md
 * §PRO-07): listado + alta/edición en pestañas, mismo criterio que
 * `ProcessTasksModalComponent` (evita anidar dos overlays "fixed inset-0").
 */
@Component({
  selector: 'app-process-counterparties-modal',
  standalone: true,
  imports: [ReactiveFormsModule, HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div class="flex w-full max-w-xl flex-col overflow-hidden rounded-lg border border-default bg-surface shadow-2xl md:max-w-2xl" style="max-height: 90vh">
          <div class="flex items-center justify-between border-b border-default p-6 pb-0">
            <div>
              <h3 class="text-lg font-semibold text-text">Contrapartes</h3>
              <p class="text-sm text-subtle">{{ processTitle() }}</p>
            </div>
            <button
              type="button"
              (click)="onClose()"
              class="rounded-md p-2 text-subtle hover:bg-surface-muted hover:text-muted"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex gap-4 border-b border-default px-6 pt-4">
            <button
              type="button"
              (click)="activeTab.set('list')"
              class="border-b-2 px-1 pb-3 text-sm font-medium transition"
              [class.border-navy-900]="activeTab() === 'list'"
              [class.text-text]="activeTab() === 'list'"
              [class.border-transparent]="activeTab() !== 'list'"
              [class.text-subtle]="activeTab() !== 'list'"
            >
              Listado ({{ counterparties().length }})
            </button>
            <button
              *hasPermission="'legal_processes.edit'"
              type="button"
              (click)="openCreateForm()"
              class="border-b-2 px-1 pb-3 text-sm font-medium transition"
              [class.border-navy-900]="activeTab() === 'form'"
              [class.text-text]="activeTab() === 'form'"
              [class.border-transparent]="activeTab() !== 'form'"
              [class.text-subtle]="activeTab() !== 'form'"
            >
              {{ editingId() ? 'Editar contraparte' : 'Nueva contraparte' }}
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6">
            @switch (activeTab()) {
              @case ('form') {
                <form class="grid gap-4" [formGroup]="form" (ngSubmit)="save()">
                  <div class="flex gap-4 text-sm text-muted">
                    <label class="flex items-center gap-2">
                      <input type="radio" formControlName="personType" value="NATURAL" />
                      Persona natural
                    </label>
                    <label class="flex items-center gap-2">
                      <input type="radio" formControlName="personType" value="JURIDICA" />
                      Persona jurídica
                    </label>
                  </div>

                  <label class="text-sm text-muted">
                    {{ isJuridica() ? 'Razón social *' : 'Nombre completo *' }}
                    <input
                      formControlName="fullName"
                      type="text"
                      [placeholder]="isJuridica() ? 'Ej: Banco XYZ S.A.S.' : 'Ej: Juan Pérez'"
                      class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    />
                    @if (form.get('fullName')?.touched && form.get('fullName')?.invalid) {
                      <p class="mt-1 text-xs text-danger">Campo requerido</p>
                    }
                  </label>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <label class="text-sm text-muted">
                      Tipo de documento
                      <select
                        formControlName="documentTypeId"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      >
                        <option value="">Automático</option>
                        @for (documentType of documentTypesForPersonType(); track documentType.id) {
                          <option [value]="documentType.id">{{ documentType.label }}</option>
                        }
                      </select>
                    </label>
                    <label class="text-sm text-muted">
                      Número de identificación *
                      <input
                        formControlName="identificationNumber"
                        type="text"
                        placeholder="Cédula, NIT, Pasaporte"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      />
                      @if (form.get('identificationNumber')?.touched && form.get('identificationNumber')?.invalid) {
                        <p class="mt-1 text-xs text-danger">Campo requerido</p>
                      }
                    </label>
                  </div>

                  <label class="text-sm text-muted">
                    Apoderado
                    <input
                      formControlName="attorneyName"
                      type="text"
                      placeholder="Nombre del apoderado, si se conoce"
                      class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    />
                  </label>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <label class="text-sm text-muted">
                      Correo de contacto
                      <input
                        formControlName="contactEmail"
                        type="email"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      />
                      @if (form.get('contactEmail')?.touched && form.get('contactEmail')?.invalid) {
                        <p class="mt-1 text-xs text-danger">Correo inválido</p>
                      }
                    </label>
                    <label class="text-sm text-muted">
                      Teléfono de contacto
                      <input
                        formControlName="contactPhone"
                        type="text"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      />
                    </label>
                  </div>

                  <label class="text-sm text-muted">
                    Notas
                    <textarea
                      formControlName="notes"
                      rows="2"
                      class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    ></textarea>
                  </label>

                  @if (errorMessage()) {
                    <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ errorMessage() }}</p>
                  }

                  <div class="flex gap-2">
                    <button
                      type="submit"
                      class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:opacity-50 disabled:cursor-not-allowed"
                      [disabled]="isSaving() || form.invalid"
                    >
                      Guardar
                    </button>
                    @if (editingId()) {
                      <button
                        type="button"
                        (click)="cancelEdit()"
                        class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
                      >
                        Cancelar
                      </button>
                    }
                  </div>
                </form>
              }
              @default {
                @if (isLoading()) {
                  <div class="flex items-center justify-center py-8">
                    <div class="h-6 w-6 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
                  </div>
                } @else if (counterparties().length === 0) {
                  <p class="rounded-lg border border-default bg-surface-muted p-6 text-center text-sm text-subtle">
                    No hay contrapartes registradas para este proceso
                  </p>
                } @else {
                  <ul class="space-y-2">
                    @for (counterparty of counterparties(); track counterparty.id) {
                      <li class="rounded-lg border border-default bg-surface p-3">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                              <p class="text-sm font-medium text-text">{{ counterparty.fullName }}</p>
                              <span class="rounded-full border border-default bg-surface-muted px-2 py-0.5 text-xs font-semibold text-muted">
                                {{ counterparty.personType === 'JURIDICA' ? 'Jurídica' : 'Natural' }}
                              </span>
                            </div>
                            <p class="mt-1 text-xs text-subtle">
                              {{ counterparty.documentType?.label || 'Documento' }}: {{ counterparty.identificationNumber }}
                            </p>
                            @if (counterparty.attorneyName) {
                              <p class="mt-1 text-xs text-muted">Apoderado: {{ counterparty.attorneyName }}</p>
                            }
                            @if (counterparty.contactEmail || counterparty.contactPhone) {
                              <p class="mt-1 text-xs text-muted">
                                {{ counterparty.contactEmail }}
                                @if (counterparty.contactEmail && counterparty.contactPhone) { &middot; }
                                {{ counterparty.contactPhone }}
                              </p>
                            }
                          </div>
                          <div class="flex flex-shrink-0 items-center gap-1">
                            <button
                              *hasPermission="'legal_processes.edit'"
                              type="button"
                              (click)="openEditForm(counterparty)"
                              class="rounded-lg p-2 text-muted transition hover:bg-surface-muted"
                              title="Editar contraparte"
                            >
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                              </svg>
                            </button>
                            <button
                              *hasPermission="'legal_processes.edit'"
                              type="button"
                              (click)="remove(counterparty)"
                              class="rounded-lg p-2 text-danger transition hover:bg-danger-tint"
                              title="Eliminar contraparte"
                            >
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </li>
                    }
                  </ul>
                }
              }
            }
          </div>

          <div class="border-t border-default p-4">
            <button
              type="button"
              (click)="onClose()"
              class="w-full rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProcessCounterpartiesModalComponent implements OnChanges {
  isOpen = input(false);
  legalProcessId = input<string | null>(null);
  processTitle = input<string | null>(null);

  close = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly legalProcessesService = inject(LegalProcessesService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  readonly activeTab = signal<CounterpartiesModalTab>('list');
  readonly counterparties = signal<ProcessCounterpartyResponse[]>([]);
  readonly documentTypes = signal<CatalogItem[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    personType: [ClientPersonType.NATURAL],
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
    documentTypeId: [''],
    identificationNumber: ['', [Validators.required]],
    attorneyName: [''],
    contactEmail: ['', [Validators.email]],
    contactPhone: [''],
    notes: [''],
  });

  private readonly personTypeValue = toSignal(
    this.form.get('personType')!.valueChanges.pipe(startWith(this.form.get('personType')!.value)),
    { initialValue: ClientPersonType.NATURAL },
  );

  readonly isJuridica = computed(() => this.personTypeValue() === ClientPersonType.JURIDICA);

  readonly documentTypesForPersonType = computed(() => {
    const personType = this.personTypeValue();
    return this.documentTypes().filter(
      (item) => !item.personTypeScope || item.personTypeScope === personType,
    );
  });

  constructor() {
    this.catalogsService.getActiveCatalog('document_type').subscribe((items) => this.documentTypes.set(items));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen() && this.legalProcessId()) {
      this.activeTab.set('list');
      this.errorMessage.set(null);
      this.loadCounterparties();
    }
  }

  private loadCounterparties(): void {
    const processId = this.legalProcessId();
    if (!processId) {
      return;
    }
    this.isLoading.set(true);
    this.legalProcessesService.getCounterparties(processId).subscribe({
      next: (counterparties) => {
        this.counterparties.set(counterparties);
        this.isLoading.set(false);
      },
      error: () => {
        this.counterparties.set([]);
        this.isLoading.set(false);
      },
    });
  }

  onClose(): void {
    this.close.emit();
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.errorMessage.set(null);
    this.form.reset({
      personType: ClientPersonType.NATURAL,
      fullName: '',
      documentTypeId: '',
      identificationNumber: '',
      attorneyName: '',
      contactEmail: '',
      contactPhone: '',
      notes: '',
    });
    this.activeTab.set('form');
  }

  openEditForm(counterparty: ProcessCounterpartyResponse): void {
    this.editingId.set(counterparty.id);
    this.errorMessage.set(null);
    this.form.reset({
      personType: counterparty.personType,
      fullName: counterparty.fullName,
      documentTypeId: counterparty.documentType?.id || '',
      identificationNumber: counterparty.identificationNumber,
      attorneyName: counterparty.attorneyName || '',
      contactEmail: counterparty.contactEmail || '',
      contactPhone: counterparty.contactPhone || '',
      notes: counterparty.notes || '',
    });
    this.activeTab.set('form');
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.activeTab.set('list');
  }

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }
    const processId = this.legalProcessId();
    if (!processId) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();
    const editingId = this.editingId();

    const request$ = editingId
      ? this.legalProcessesService.updateCounterparty(editingId, {
          fullName: value.fullName,
          personType: value.personType,
          documentTypeId: value.documentTypeId || undefined,
          identificationNumber: value.identificationNumber,
          attorneyName: value.attorneyName || undefined,
          contactEmail: value.contactEmail || undefined,
          contactPhone: value.contactPhone || undefined,
          notes: value.notes || undefined,
        })
      : this.legalProcessesService.createCounterparty({
          legalProcessId: processId,
          fullName: value.fullName,
          personType: value.personType,
          documentTypeId: value.documentTypeId || undefined,
          identificationNumber: value.identificationNumber,
          attorneyName: value.attorneyName || undefined,
          contactEmail: value.contactEmail || undefined,
          contactPhone: value.contactPhone || undefined,
          notes: value.notes || undefined,
        });

    request$.subscribe({
      next: (counterparty) => {
        this.isSaving.set(false);
        this.toast.success(editingId ? 'Contraparte actualizada exitosamente' : 'Contraparte creada exitosamente');
        // F40 §CLI-12: solo create() devuelve documentConflict — no bloquea,
        // solo advierte en qué proceso ya figura ese documento como cliente.
        if (counterparty.documentConflict) {
          this.toast.warning(
            `El documento ${value.identificationNumber} ya está registrado como cliente ("${counterparty.documentConflict.matchedName}").`,
          );
        }
        this.editingId.set(null);
        this.activeTab.set('list');
        this.loadCounterparties();
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al guardar la contraparte');
        this.isSaving.set(false);
      },
    });
  }

  async remove(counterparty: ProcessCounterpartyResponse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar contraparte',
      message: `¿Eliminar a "${counterparty.fullName}" como contraparte de este proceso?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.legalProcessesService.removeCounterparty(counterparty.id).subscribe({
      next: () => {
        this.toast.success('Contraparte eliminada exitosamente');
        this.loadCounterparties();
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al eliminar la contraparte');
      },
    });
  }
}
