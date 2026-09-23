import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { Holiday } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-holidays',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold text-text">Festivos</h1>
        <button
          type="button"
          class="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white"
          (click)="toggleCreateForm()"
        >
          {{ showCreateForm() ? 'Cancelar' : 'Nuevo festivo' }}
        </button>
      </div>

      @if (showCreateForm()) {
        <form class="rounded-lg border border-default bg-surface p-5" [formGroup]="createForm" (ngSubmit)="onCreate()">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label class="block text-xs uppercase text-subtle">Fecha</label>
              <input type="date" formControlName="date" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs uppercase text-subtle">Nombre</label>
              <input formControlName="name" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
          </div>
          <button
            type="submit"
            class="mt-4 rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="createForm.invalid || isSaving()"
          >
            Crear festivo
          </button>
        </form>
      }

      @if (editingHolidayId()) {
        <form class="rounded-lg border border-default bg-surface p-5" [formGroup]="editForm" (ngSubmit)="onUpdate()">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-text">Editar festivo del {{ formatDate(editingHolidayDate()!) }}</h2>
            <button type="button" class="text-sm text-subtle hover:underline" (click)="cancelEdit()">Cancelar</button>
          </div>
          <!-- La fecha es la identidad del festivo (ver UpdateHolidayDto en el backend) — solo el nombre es editable. -->
          <div>
            <label class="block text-xs uppercase text-subtle">Nombre</label>
            <input formControlName="name" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
          </div>
          <button
            type="submit"
            class="mt-4 rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="editForm.invalid || isSaving()"
          >
            Guardar cambios
          </button>
        </form>
      }

      <div class="flex items-center gap-3">
        <label class="text-xs uppercase text-subtle" for="year-filter">Año</label>
        <select
          id="year-filter"
          class="rounded-md border border-default bg-surface px-3 py-2 text-sm text-text"
          [value]="selectedYear()"
          (change)="onYearFilterChange($event)"
        >
          <option value="all">Todos</option>
          @for (year of years(); track year) {
            <option [value]="year">{{ year }}</option>
          }
        </select>
      </div>

      <div class="overflow-x-auto rounded-lg border border-default bg-surface">
        <table class="w-full text-left text-sm">
          <thead class="bg-surface-muted text-xs uppercase text-subtle">
            <tr>
              <th class="px-4 py-2">Fecha</th>
              <th class="px-4 py-2">Nombre</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            @for (holiday of filteredHolidays(); track holiday.id) {
              <tr class="border-t border-default">
                <td class="px-4 py-2 text-text">{{ formatDate(holiday.date) }}</td>
                <td class="px-4 py-2 text-text">{{ holiday.name }}</td>
                <td class="px-4 py-2 text-right">
                  <button type="button" class="mr-4 text-sm font-medium text-navy-900 hover:underline" (click)="startEdit(holiday)">
                    Editar
                  </button>
                  <button type="button" class="text-sm font-medium text-danger hover:underline" (click)="remove(holiday)">
                    Eliminar
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td class="px-4 py-6 text-center text-subtle" colspan="3">No hay festivos registrados para este filtro.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AdminHolidaysComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly platformAdminService = inject(PlatformAdminService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  readonly holidays = signal<Holiday[]>([]);
  readonly isSaving = signal(false);
  readonly showCreateForm = signal(false);
  readonly editingHolidayId = signal<string | null>(null);
  readonly editingHolidayDate = signal<string | null>(null);
  readonly selectedYear = signal<number | 'all'>('all');

  // Años presentes en el listado actual, para el filtro — permite ver de un
  // vistazo (y "por lote") todos los festivos de un año en particular.
  readonly years = computed(() => {
    const distinct = new Set(this.holidays().map((h) => this.yearOf(h.date)));
    return Array.from(distinct).sort((a, b) => a - b);
  });

  readonly filteredHolidays = computed(() => {
    const year = this.selectedYear();
    const holidays = this.holidays();
    const filtered = year === 'all' ? holidays : holidays.filter((h) => this.yearOf(h.date) === year);
    return [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  });

  readonly createForm = this.fb.nonNullable.group({
    date: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(150)]],
  });

  readonly editForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    this.loadHolidays();
  }

  private loadHolidays(): void {
    this.platformAdminService.listHolidays().subscribe({
      next: (holidays) => this.holidays.set(holidays),
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  private yearOf(date: string): number {
    return Number(date.slice(0, 4));
  }

  formatDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  onYearFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedYear.set(value === 'all' ? 'all' : Number(value));
  }

  toggleCreateForm(): void {
    this.editingHolidayId.set(null);
    this.showCreateForm.set(!this.showCreateForm());
  }

  startEdit(holiday: Holiday): void {
    this.showCreateForm.set(false);
    this.editingHolidayId.set(holiday.id);
    this.editingHolidayDate.set(holiday.date);
    this.editForm.reset({ name: holiday.name });
  }

  cancelEdit(): void {
    this.editingHolidayId.set(null);
    this.editingHolidayDate.set(null);
  }

  onCreate(): void {
    if (this.createForm.invalid || this.isSaving()) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.getRawValue();
    this.isSaving.set(true);
    this.platformAdminService.createHoliday({ date: value.date, name: value.name }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showCreateForm.set(false);
        this.createForm.reset();
        this.toast.success('Festivo creado correctamente.');
        this.loadHolidays();
      },
      error: (error: Error) => {
        this.isSaving.set(false);
        this.toast.error(error.message);
      },
    });
  }

  onUpdate(): void {
    const id = this.editingHolidayId();
    if (!id || this.editForm.invalid || this.isSaving()) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.getRawValue();
    this.isSaving.set(true);
    this.platformAdminService.updateHoliday(id, { name: value.name }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.cancelEdit();
        this.toast.success('Festivo actualizado correctamente.');
        this.loadHolidays();
      },
      error: (error: Error) => {
        this.isSaving.set(false);
        this.toast.error(error.message);
      },
    });
  }

  async remove(holiday: Holiday): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar festivo',
      message: `${holiday.name} (${this.formatDate(holiday.date)}) se eliminará del calendario de festivos de la plataforma. Esta acción no se puede deshacer.`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.platformAdminService.deleteHoliday(holiday.id).subscribe({
      next: () => {
        this.toast.success('Festivo eliminado.');
        this.loadHolidays();
      },
      error: (error: Error) => this.toast.error(error.message),
    });
  }
}
