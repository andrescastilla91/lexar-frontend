import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data.service';
import { LegalDocument } from '../../core/models/document.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  template: `
    <div class="space-y-8">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-slate-800">Gestión documental</h2>
          <p class="text-sm text-slate-500">Carga, valida y rastrea expedientes clave por proceso.</p>
        </div>
      </header>

      <section class="grid gap-6 lg:grid-cols-3">
        <form class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" [formGroup]="uploadForm" (ngSubmit)="uploadDocument()">
          <h3 class="text-lg font-semibold text-slate-800">Cargar nuevo documento</h3>
          <p class="mt-1 text-sm text-slate-500">Los documentos quedan disponibles para el equipo de litigio y cumplimiento.</p>

          <div class="mt-4 grid gap-4">
            <label class="text-sm text-slate-600">
              Proceso asociado
              <select
                formControlName="processId"
                class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              >
                @for (process of processes(); track process.id) {
                  <option [value]="process.id">{{ process.title }}</option>
                }
              </select>
            </label>
            <label class="text-sm text-slate-600">
              Nombre del documento
              <input
                formControlName="title"
                type="text"
                placeholder="Ej: Acta de audiencia"
                class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              />
            </label>
            <label class="text-sm text-slate-600">
              Categoría
              <select
                formControlName="category"
                class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              >
                <option value="Demanda">Demanda</option>
                <option value="Prueba">Prueba</option>
                <option value="Contrato">Contrato</option>
                <option value="Acta">Acta</option>
                <option value="Otro">Otro</option>
              </select>
            </label>
            <label class="text-sm text-slate-600">
              Notas internas
              <textarea
                formControlName="notes"
                rows="3"
                placeholder="Instrucciones para revisión, responsables, etc."
                class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              ></textarea>
            </label>
            <label class="text-sm text-slate-600">
              Archivo
              <input
                type="file"
                (change)="onFileSelected($event)"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg"
                class="mt-2 block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 transition hover:border-[#192033]/40 hover:bg-slate-100"
              />
              <span class="mt-2 block text-xs text-slate-400">Formatos admitidos: PDF, Word, Excel, imágenes</span>
            </label>
          </div>

          @if (formError()) {
            <p class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{{ formError() }}</p>
          }

          <button
            type="submit"
            class="mt-6 w-full rounded-2xl bg-[#192033] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#111728] disabled:cursor-not-allowed disabled:bg-slate-400"
            [disabled]="isUploading()"
          >
            <span *ngIf="!isUploading(); else loading">Registrar documento</span>
            <ng-template #loading>
              <span class="flex items-center justify-center gap-2">
                Procesando
                <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
                </svg>
              </span>
            </ng-template>
          </button>
        </form>

        <div class="lg:col-span-2 space-y-6">
          <div class="grid gap-4 md:grid-cols-3">
            <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-slate-400">Documentos totales</p>
              <p class="mt-2 text-3xl font-semibold text-slate-800">{{ documents().length }}</p>
              <p class="text-sm text-slate-500">Historial consolidado en la plataforma</p>
            </article>
            <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-slate-400">Pendientes validación</p>
              <p class="mt-2 text-3xl font-semibold text-amber-500">{{ pendingDocuments().length }}</p>
              <p class="text-sm text-slate-500">A la espera de revisión jurídica</p>
            </article>
            <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-slate-400">Últimas cargas</p>
              <p class="mt-2 text-3xl font-semibold text-emerald-600">{{ recentDocuments().length }}</p>
              <p class="text-sm text-slate-500">Últimos 7 días</p>
            </article>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 class="text-lg font-semibold text-slate-800">Repositorio documental</h3>
                <p class="text-sm text-slate-500">Filtra por estado para agilizar el flujo de validación.</p>
              </div>
              <select
                class="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                [value]="statusFilter()"
                (change)="statusFilter.set(($any($event.target).value))"
              >
                <option value="todos">Todos</option>
                <option value="Validado">Validados</option>
                <option value="Pendiente">Pendientes</option>
                <option value="Observado">Observados</option>
              </select>
            </header>

            <div class="mt-6 space-y-4">
              @for (document of filteredDocuments(); track document.id) {
                <article class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p class="text-base font-semibold text-slate-800">{{ document.title }}</p>
                      <p class="text-xs uppercase tracking-wide text-slate-400">{{ processName(document.processId) }}</p>
                      <p class="mt-2 text-xs text-slate-500">{{ document.category }} • Registrado por {{ document.uploadedBy }}</p>
                    </div>
                    <div class="flex flex-col items-end gap-2 text-xs text-slate-500">
                      <span class="rounded-full px-3 py-1 font-semibold" [ngClass]="statusClasses(document.status)">
                        {{ document.status }}
                      </span>
                      <span>{{ document.uploadedAt | date: 'dd/MM/yyyy HH:mm' }}</span>
                      <span class="flex items-center gap-2 text-slate-500">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9m0 7.5 3-3m-3 3-3-3M4.5 19.5h15a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 19.5 4.5h-15A1.5 1.5 0 0 0 3 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
                        </svg>
                        {{ document.fileName }}
                      </span>
                    </div>
                  </div>
                  @if (document.notes) {
                    <p class="mt-3 rounded-2xl bg-white px-3 py-2 text-xs text-slate-500">{{ document.notes }}</p>
                  }
                </article>
              }
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class DocumentsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dataService = inject(MockDataService);
  private readonly authService = inject(AuthService);

  readonly processes = this.dataService.processes;
  readonly documents = this.dataService.documents;

  readonly uploadForm = this.fb.nonNullable.group({
    processId: [this.processes()[0]?.id ?? '', Validators.required],
    title: ['', [Validators.required, Validators.minLength(4)]],
    category: ['Demanda', Validators.required],
    notes: [''],
  });

  readonly formError = signal<string | null>(null);
  readonly isUploading = signal(false);
  readonly statusFilter = signal<'todos' | LegalDocument['status']>('todos');
  private readonly selectedFile = signal<File | null>(null);

  readonly pendingDocuments = computed(() =>
    this.documents().filter((document) => document.status === 'Pendiente')
  );

  readonly recentDocuments = computed(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return this.documents().filter(
      (document) => new Date(document.uploadedAt).getTime() >= sevenDaysAgo.getTime()
    );
  });

  readonly filteredDocuments = computed(() => {
    const status = this.statusFilter();
    return this.documents().filter((document) => status === 'todos' || document.status === status);
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      this.selectedFile.set(null);
      return;
    }
    this.selectedFile.set(input.files[0]);
  }

  uploadDocument(): void {
    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      this.formError.set('Completa los campos requeridos.');
      return;
    }

    const file = this.selectedFile();
    if (!file) {
      this.formError.set('Adjunta un archivo válido.');
      return;
    }

    this.isUploading.set(true);
    this.formError.set(null);

    const { processId, title, category, notes } = this.uploadForm.getRawValue();
    const document: Omit<LegalDocument, 'id'> = {
      processId,
      title,
      category: category as LegalDocument['category'],
      uploadedBy: this.authService.currentUser()?.fullName ?? 'Equipo LexAr',
      uploadedAt: new Date().toISOString(),
      status: 'Pendiente',
      notes: notes ?? undefined,
      fileName: file.name,
    };

    this.dataService.addDocument(document);

    this.uploadForm.reset({
      processId: this.processes()[0]?.id ?? '',
      title: '',
      category: 'Demanda',
      notes: '',
    });
    this.selectedFile.set(null);
    this.isUploading.set(false);
  }

  processName(processId: string): string {
    return this.dataService.findProcessById(processId)?.title ?? 'Proceso no encontrado';
  }

  statusClasses(status: LegalDocument['status']): string {
    switch (status) {
      case 'Validado':
        return 'bg-emerald-100 text-emerald-700';
      case 'Observado':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-200 text-slate-700';
    }
  }
}
