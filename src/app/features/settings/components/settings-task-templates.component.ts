import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TasksService } from '../../../core/services/tasks.service';
import { TaskTemplateResponse } from '../../../core/models/task.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { FormModalShellComponent } from '../../../core/components/form-modal-shell.component';

@Component({
  selector: 'app-settings-task-templates',
  standalone: true,
  imports: [ReactiveFormsModule, HasPermissionDirective, FormModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <p class="text-sm text-subtle">
          Checklists reutilizables que se instancian como tareas al crear o gestionar un proceso legal.
        </p>
        <button
          *hasPermission="'tasks.manage-templates'"
          type="button"
          class="flex flex-shrink-0 items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
          (click)="openCreateModal()"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva plantilla
        </button>
      </div>

      @if (isLoading()) {
        <p class="text-sm text-subtle">Cargando plantillas…</p>
      } @else if (templates().length === 0) {
        <div class="rounded-lg border border-default bg-surface p-8 text-center shadow-card">
          <p class="text-sm text-subtle">Aún no hay plantillas de tareas configuradas.</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (template of templates(); track template.id) {
            <div class="rounded-lg border border-default bg-surface p-4 shadow-card">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-text">{{ template.name }}</p>
                  <p class="text-xs text-subtle">{{ template.items.length }} ítem(s)</p>
                </div>
                <div class="flex flex-shrink-0 items-center gap-1" *hasPermission="'tasks.manage-templates'">
                  <button
                    type="button"
                    (click)="openEditModal(template)"
                    class="rounded-lg p-2 text-muted transition hover:bg-surface-muted"
                    title="Editar plantilla"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    (click)="deleteTemplate(template)"
                    class="rounded-lg p-2 text-danger transition hover:bg-danger-tint"
                    title="Eliminar plantilla"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
              <ul class="mt-3 space-y-1">
                @for (item of template.items; track item.id) {
                  <li class="flex items-center justify-between text-xs text-subtle">
                    <span>{{ item.title }}</span>
                    <span class="tabular-data">día +{{ item.offsetDays }}</span>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      }
    </div>

    <app-form-modal-shell
      [title]="editingTemplate() ? 'Editar plantilla' : 'Nueva plantilla'"
      [isOpen]="modalOpen()"
      [isSubmitting]="isSubmitting()"
      submitLabel="Guardar"
      (cancel)="closeModal()"
      (submit)="submit()"
    >
      <form [formGroup]="form" class="grid gap-4">
        <label class="text-sm text-muted">
          Nombre *
          <input
            formControlName="name"
            type="text"
            placeholder="Ej. Demanda ejecutiva"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
          />
        </label>

        <div>
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm text-muted">Ítems *</span>
            <button
              type="button"
              (click)="addItem()"
              class="text-xs font-semibold text-primary underline"
            >
              + Agregar ítem
            </button>
          </div>
          <div class="space-y-2">
            @for (item of items.controls; track $index) {
              <div class="grid grid-cols-[minmax(0,1fr)_100px_auto] items-center gap-2" [formGroup]="asGroup(item)">
                <input
                  formControlName="title"
                  type="text"
                  placeholder="Título de la tarea"
                  class="rounded-md border border-default px-3 py-2 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
                <input
                  formControlName="offsetDays"
                  type="number"
                  min="0"
                  placeholder="Día +"
                  class="rounded-md border border-default px-3 py-2 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
                <button
                  type="button"
                  (click)="removeItem($index)"
                  class="rounded-lg p-2 text-danger transition hover:bg-danger-tint"
                  title="Quitar ítem"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            }
          </div>
        </div>

        @if (formError()) {
          <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ formError() }}</p>
        }
      </form>
    </app-form-modal-shell>
  `,
})
export class SettingsTaskTemplatesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tasksService = inject(TasksService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  readonly templates = signal<TaskTemplateResponse[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly modalOpen = signal(false);
  readonly editingTemplate = signal<TaskTemplateResponse | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    items: this.fb.array([] as ReturnType<typeof this.buildItem>[]),
  });

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.isLoading.set(true);
    this.tasksService.getTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al cargar las plantillas');
        this.isLoading.set(false);
      },
    });
  }

  private buildItem(title = '', offsetDays = 0) {
    return this.fb.nonNullable.group({
      title: [title, [Validators.required, Validators.maxLength(200)]],
      offsetDays: [offsetDays, [Validators.required, Validators.min(0)]],
    });
  }

  asGroup(control: unknown) {
    return control as ReturnType<typeof this.buildItem>;
  }

  addItem(): void {
    this.items.push(this.buildItem());
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  openCreateModal(): void {
    this.editingTemplate.set(null);
    this.formError.set(null);
    this.form.reset({ name: '' });
    this.items.clear();
    this.addItem();
    this.modalOpen.set(true);
  }

  openEditModal(template: TaskTemplateResponse): void {
    this.editingTemplate.set(template);
    this.formError.set(null);
    this.form.reset({ name: template.name });
    this.items.clear();
    for (const item of template.items) {
      this.items.push(this.buildItem(item.title, item.offsetDays));
    }
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.formError.set(null);
  }

  submit(): void {
    if (this.isSubmitting()) {
      return;
    }
    if (this.form.invalid || this.items.length === 0) {
      this.form.markAllAsTouched();
      this.formError.set('Completa el nombre y al menos un ítem.');
      return;
    }

    this.isSubmitting.set(true);
    this.formError.set(null);
    const formValue = this.form.getRawValue();
    const payload = {
      name: formValue.name,
      items: formValue.items.map((item, index) => ({
        title: item.title,
        offsetDays: item.offsetDays,
        sortOrder: index,
      })),
    };

    const editing = this.editingTemplate();
    const request$ = editing
      ? this.tasksService.updateTemplate(editing.id, payload)
      : this.tasksService.createTemplate(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success(editing ? 'Plantilla actualizada correctamente.' : 'Plantilla creada correctamente.');
        this.closeModal();
        this.loadTemplates();
      },
      error: (error) => {
        this.formError.set(error.message || 'Error al guardar la plantilla');
        this.toast.error(error.message || 'Error al guardar la plantilla');
        this.isSubmitting.set(false);
      },
    });
  }

  async deleteTemplate(template: TaskTemplateResponse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar plantilla',
      message: `¿Estás seguro de eliminar la plantilla "${template.name}"?`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.tasksService.deleteTemplate(template.id).subscribe({
      next: () => {
        this.toast.success('Plantilla eliminada correctamente.');
        this.loadTemplates();
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al eliminar la plantilla');
      },
    });
  }
}
