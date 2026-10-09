import { ChangeDetectionStrategy, Component, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ClientsService } from '../../../../core/services/clients.service';
import { CatalogsService } from '../../../../core/services/catalogs.service';
import { FilesService } from '../../../../core/services/files.service';
import {
  ClientResponse,
  DataProcessingAuthorizationMethod,
} from '../../../../core/models/client-backend.model';
import { FileModel } from '../../../../core/models/file.model';
import { ToastService } from '../../../../core/services/toast.service';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';

const DATA_PROCESSING_DOCUMENT_TYPE_CODE = 'AUTORIZACION_TRATAMIENTO_DATOS';

/**
 * F44 §LEG-02 (ola 3): autorización de tratamiento de datos personales del
 * cliente — indicador obtenida/no, fecha, medio (física/digital) y soporte
 * adjunto. Extraído como panel propio (en vez de seguir ampliando
 * `ClientDetailComponent`, ya en el límite del tamaño de contenedor del
 * Design System) — mismo patrón que `ClientContactsPanelComponent`/
 * `ClientMattersPanelComponent`. No reutiliza `riskLevelId`/`laftRiskId`
 * de `editForm` (sigue ahí, sin cambios) ni `EntityFilesComponent` (que
 * siempre lista TODOS los archivos del cliente, sin filtrar por tipo
 * documental) — el soporte adjunto se sube aquí directo contra
 * `FilesService.uploadFile`, pineado al tipo documental propio.
 */
@Component({
  selector: 'app-client-data-processing-authorization-panel',
  standalone: true,
  imports: [ReactiveFormsModule, HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 rounded-lg border border-default bg-surface p-6 shadow-card">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-text">Autorización de tratamiento de datos</h3>
        <span
          class="inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold"
          [class]="client().dataProcessingAuthorized ? 'bg-success-tint text-success' : 'bg-warning-tint text-warning'"
        >
          {{ client().dataProcessingAuthorized ? 'Obtenida' : 'No obtenida' }}
        </span>
      </div>

      @if (!canEdit()) {
        <div class="rounded-md border border-default bg-surface-muted p-3 text-xs text-subtle">
          No tienes permiso para editar la autorización de tratamiento de datos del cliente.
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 lg:grid-cols-3">
        <label class="flex items-center gap-2 text-sm text-muted lg:col-span-3">
          <input type="checkbox" formControlName="authorized" />
          El cliente autorizó el tratamiento de sus datos personales
        </label>

        <label class="block text-sm text-muted">
          Fecha de autorización
          <input
            type="date"
            formControlName="authorizedAt"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
          />
        </label>

        <label class="block text-sm text-muted">
          Medio
          <select
            formControlName="method"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:bg-surface-muted disabled:text-subtle"
          >
            <option value="">Seleccione...</option>
            <option value="FISICA">Física</option>
            <option value="DIGITAL">Digital</option>
          </select>
        </label>

        <div class="flex items-end">
          <button
            *hasPermission="'clients.edit-compliance'"
            type="submit"
            class="w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
            [disabled]="!canEdit() || isSaving() || form.invalid"
          >
            Guardar
          </button>
        </div>
      </form>

      @if (errorMessage()) {
        <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
          {{ errorMessage() }}
        </div>
      }

      <div class="space-y-2 border-t border-default pt-4">
        <p class="text-xs font-semibold text-muted">Soporte adjunto</p>

        @if (attachedFiles().length === 0) {
          <p class="text-xs text-subtle">No hay ningún soporte cargado.</p>
        } @else {
          <ul class="space-y-1">
            @for (file of attachedFiles(); track file.id) {
              <li class="flex items-center justify-between gap-2 text-xs text-muted">
                <span class="truncate">{{ file.originalFilename }}</span>
                <button type="button" (click)="downloadFile(file)" class="shrink-0 font-semibold text-navy-900 hover:underline">
                  Descargar
                </button>
              </li>
            }
          </ul>
        }

        <label
          *hasPermission="'files.upload'"
          class="inline-block cursor-pointer rounded-md border border-default bg-surface-muted px-3 py-2 text-xs font-semibold text-muted transition hover:bg-primary-tint hover:text-info"
        >
          {{ isUploading() ? 'Subiendo...' : 'Adjuntar soporte' }}
          <input type="file" class="sr-only" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" (change)="onFileSelected($event)" [disabled]="isUploading()" />
        </label>
      </div>
    </div>
  `,
})
export class ClientDataProcessingAuthorizationPanelComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clientsService = inject(ClientsService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly filesService = inject(FilesService);
  private readonly toast = inject(ToastService);

  readonly clientId = input.required<string>();
  readonly client = input.required<ClientResponse>();
  readonly canEdit = input<boolean>(false);
  readonly updated = output<ClientResponse>();

  readonly isSaving = signal(false);
  readonly isUploading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly attachedFiles = signal<FileModel[]>([]);
  private readonly documentTypeId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    authorized: [false],
    authorizedAt: [''],
    method: [''],
  });

  constructor() {
    effect(() => {
      const client = this.client();
      this.form.patchValue(
        {
          authorized: client.dataProcessingAuthorized ?? false,
          authorizedAt: (client.dataProcessingAuthorizedAt ?? '').slice(0, 10),
          method: client.dataProcessingAuthorizationMethod ?? '',
        },
        { emitEvent: false },
      );
    });

    effect(() => {
      if (this.canEdit()) {
        this.form.enable({ emitEvent: false });
      } else {
        this.form.disable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.catalogsService.getActiveCatalog('case_document_type').subscribe({
      next: (items) => {
        const item = items.find((i) => i.code === DATA_PROCESSING_DOCUMENT_TYPE_CODE);
        this.documentTypeId.set(item?.id ?? null);
      },
    });

    this.filesService.getFilesByEntity('client', this.clientId()).subscribe({
      next: (files) => this.refreshAttachedFiles(files),
    });
  }

  private refreshAttachedFiles(files: FileModel[]): void {
    const id = this.documentTypeId();
    this.attachedFiles.set(
      id ? files.filter((file) => file.documentTypeId === id) : [],
    );
  }

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      return;
    }
    const { authorized, authorizedAt, method } = this.form.getRawValue();

    if (authorized && (!authorizedAt || !method)) {
      this.errorMessage.set('La fecha y el medio son requeridos para marcar la autorización como obtenida');
      return;
    }

    // F44 §LEG-02: una autorización física sin soporte adjunto no es
    // evidencia de nada — misma regla que valida el backend
    // (ClientsService.assertDataProcessingAuthorizationHasAttachment), acá
    // solo para dar feedback inmediato sin esperar el roundtrip.
    if (authorized && method === 'FISICA' && this.attachedFiles().length === 0) {
      this.errorMessage.set('El soporte adjunto es obligatorio para marcar la autorización como obtenida por medio físico');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    this.clientsService
      .updateClientCompliance(this.clientId(), {
        dataProcessingAuthorized: authorized,
        ...(authorized
          ? {
              dataProcessingAuthorizedAt: authorizedAt,
              dataProcessingAuthorizationMethod: method as DataProcessingAuthorizationMethod,
            }
          : {}),
      })
      .subscribe({
        next: (client) => {
          this.isSaving.set(false);
          this.toast.success('Cliente actualizado exitosamente');
          this.updated.emit(client);
        },
        error: (error) => {
          const message = error.message || 'Error al actualizar cliente';
          this.errorMessage.set(message);
          this.toast.error(message);
          this.isSaving.set(false);
        },
      });
  }

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) {
      return;
    }
    const documentTypeId = this.documentTypeId();
    if (!documentTypeId) {
      this.toast.error('No se pudo determinar el tipo documental del soporte');
      return;
    }

    this.isUploading.set(true);
    this.filesService
      .uploadFile(file, 'client', this.clientId(), undefined, undefined, documentTypeId)
      .subscribe({
        next: (uploaded) => {
          this.isUploading.set(false);
          this.attachedFiles.update((files) => [...files, uploaded]);
          this.toast.success('Soporte cargado exitosamente');
        },
        error: (error) => {
          this.isUploading.set(false);
          this.toast.error(error.message || 'Error al cargar el soporte');
        },
      });
  }

  downloadFile(file: FileModel): void {
    this.filesService.downloadFile(file.id).subscribe();
  }
}
