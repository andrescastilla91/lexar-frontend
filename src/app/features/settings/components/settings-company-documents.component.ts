import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { CompanyDocument, CompanyDocumentType } from '../../../core/models/company.model';
import { CompanyDocumentsService } from '../../../core/services/company-documents.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';

interface DocumentRow {
  type: CompanyDocumentType;
  label: string;
  hint: string;
  requiredToSubscribe: boolean;
  needsIssueDate: boolean;
}

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx';

@Component({
  selector: 'app-settings-company-documents',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <h2 class="text-lg font-semibold text-text">Documentos de la empresa</h2>
      <p class="mt-1 text-sm text-subtle">
        Solo los administradores de tu empresa ven estos documentos. El RUT es necesario para contratar un plan de pago.
      </p>

      @if (loadError()) {
        <div class="mt-4 rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
          {{ loadError() }}
        </div>
      }

      <ul class="mt-4 divide-y divide-default">
        @for (row of rows; track row.type) {
          <li class="flex flex-col gap-3 py-4" [attr.data-document-type]="row.type">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-medium text-text">{{ row.label }}</p>
              @if (row.requiredToSubscribe) {
                <span class="rounded-full bg-surface-muted px-2 py-1 text-xs font-medium text-subtle">
                  Requerido para contratar
                </span>
              }
              @if (documentOf(row.type); as doc) {
                @if (doc.isExpired) {
                  <span
                    class="rounded-full bg-warning/15 px-2 py-1 text-xs font-medium text-warning"
                    data-test="expired-badge"
                  >
                    Vencido
                  </span>
                }
              }
            </div>
            <p class="text-xs text-subtle">{{ row.hint }}</p>

            @if (documentOf(row.type); as doc) {
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text">
                @if (doc.downloadUrl) {
                  <a [href]="doc.downloadUrl" target="_blank" rel="noopener" class="font-medium text-navy-900 underline">
                    {{ doc.originalFilename }}
                  </a>
                } @else {
                  <span>{{ doc.originalFilename }}</span>
                }
                @if (doc.issuedAt) {
                  <span class="text-subtle">Expedido el {{ doc.issuedAt | date: 'd MMM y' : 'UTC' }}</span>
                }
              </div>
              @if (doc.isExpired) {
                <p class="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-text" data-test="expired-notice">
                  Este certificado se expidió hace más de 90 días (venció el {{ doc.expiresAt | date: 'd MMM y' : 'UTC' }}).
                  Carga uno reciente; no se bloquea ninguna operación por esto.
                </p>
              }
            } @else {
              <p class="text-sm text-subtle">Aún no has cargado este documento.</p>
            }

            @if (row.needsIssueDate) {
              <label class="block text-sm text-muted sm:w-56">
                Fecha de expedición
                <input
                  type="date"
                  [max]="today"
                  [value]="issueDate()"
                  (input)="issueDate.set($any($event.target).value)"
                  data-test="issue-date"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
            }

            <div class="flex flex-wrap items-center gap-2">
              <label
                class="relative inline-flex min-h-11 cursor-pointer items-center rounded-md border border-default px-4 py-2 text-sm font-medium text-text transition hover:bg-surface-muted"
                [class.pointer-events-none]="isBusy(row.type) || (row.needsIssueDate && !issueDate())"
                [class.opacity-50]="isBusy(row.type) || (row.needsIssueDate && !issueDate())"
              >
                {{ documentOf(row.type) ? 'Reemplazar' : 'Cargar archivo' }}
                <input
                  type="file"
                  class="sr-only"
                  [accept]="accepted"
                  [disabled]="isBusy(row.type) || (row.needsIssueDate && !issueDate())"
                  (change)="onFileSelected(row, $event)"
                />
              </label>
              @if (documentOf(row.type)) {
                <button
                  type="button"
                  class="min-h-11 rounded-md px-4 py-2 text-sm font-medium text-danger transition hover:bg-danger-tint disabled:opacity-50"
                  [disabled]="isBusy(row.type)"
                  (click)="onRemove(row)"
                >
                  Eliminar
                </button>
              }
              @if (row.needsIssueDate && !issueDate()) {
                <span class="text-xs text-subtle">Indica la fecha de expedición para poder cargar el archivo.</span>
              }
              @if (isBusy(row.type)) {
                <span class="text-xs text-subtle">Procesando…</span>
              }
            </div>
          </li>
        }
      </ul>
    </div>
  `,
})
export class SettingsCompanyDocumentsComponent implements OnInit {
  private readonly documentsService = inject(CompanyDocumentsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  /** Avisa al contenedor para que recalcule qué le falta al tenant. */
  readonly changed = output<void>();

  protected readonly accepted = ACCEPTED_TYPES;
  protected readonly today = new Date().toISOString().slice(0, 10);

  protected readonly rows: DocumentRow[] = [
    {
      type: 'RUT',
      label: 'RUT',
      hint: 'Registro Único Tributario vigente de la empresa.',
      requiredToSubscribe: true,
      needsIssueDate: false,
    },
    {
      type: 'CHAMBER_OF_COMMERCE',
      label: 'Certificado de cámara de comercio',
      hint: 'Certificado de existencia y representación legal. Se considera vencido a los 90 días de su expedición.',
      requiredToSubscribe: false,
      needsIssueDate: true,
    },
    {
      type: 'LEGAL_REP_ID',
      label: 'Cédula del representante legal',
      hint: 'Copia legible por ambas caras.',
      requiredToSubscribe: false,
      needsIssueDate: false,
    },
  ];

  protected readonly documents = signal<CompanyDocument[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly issueDate = signal('');
  private readonly busyTypes = signal<ReadonlySet<CompanyDocumentType>>(new Set());

  private readonly byType = computed(
    () => new Map(this.documents().map((document) => [document.documentType, document])),
  );

  ngOnInit(): void {
    this.reload();
  }

  protected documentOf(type: CompanyDocumentType): CompanyDocument | undefined {
    return this.byType().get(type);
  }

  protected isBusy(type: CompanyDocumentType): boolean {
    return this.busyTypes().has(type);
  }

  protected onFileSelected(row: DocumentRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.isBusy(row.type)) {
      return;
    }
    if (row.needsIssueDate && !this.issueDate()) {
      return;
    }

    this.setBusy(row.type, true);
    this.documentsService.upload(row.type, file, row.needsIssueDate ? this.issueDate() : undefined).subscribe({
      next: () => {
        this.setBusy(row.type, false);
        if (row.needsIssueDate) {
          this.issueDate.set('');
        }
        this.toast.success('Documento cargado correctamente.');
        this.reload();
        this.changed.emit();
      },
      error: (error: Error) => {
        this.setBusy(row.type, false);
        this.toast.error(error.message || 'No se pudo cargar el documento.');
      },
    });
  }

  protected async onRemove(row: DocumentRow): Promise<void> {
    if (this.isBusy(row.type)) {
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar documento',
      message: `Vas a eliminar «${row.label}». ${
        row.requiredToSubscribe ? 'Sin el RUT no podrás contratar un plan de pago. ' : ''
      }¿Deseas continuar?`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.setBusy(row.type, true);
    this.documentsService.remove(row.type).subscribe({
      next: () => {
        this.setBusy(row.type, false);
        this.toast.success('Documento eliminado.');
        this.reload();
        this.changed.emit();
      },
      error: (error: Error) => {
        this.setBusy(row.type, false);
        this.toast.error(error.message || 'No se pudo eliminar el documento.');
      },
    });
  }

  private reload(): void {
    this.documentsService.list().subscribe({
      next: (documents) => {
        this.documents.set(documents);
        this.loadError.set(null);
      },
      error: () => this.loadError.set('No se pudieron cargar los documentos de la empresa.'),
    });
  }

  private setBusy(type: CompanyDocumentType, busy: boolean): void {
    this.busyTypes.update((current) => {
      const next = new Set(current);
      if (busy) {
        next.add(type);
      } else {
        next.delete(type);
      }
      return next;
    });
  }
}
