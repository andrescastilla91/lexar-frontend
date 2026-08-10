import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminPlan } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-plans',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold text-text">Catálogo de planes</h1>
        <button
          type="button"
          class="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white"
          (click)="showCreateForm.set(!showCreateForm())"
        >
          {{ showCreateForm() ? 'Cancelar' : 'Nuevo plan' }}
        </button>
      </div>

      @if (showCreateForm()) {
        <form class="rounded-lg border border-default bg-surface p-5" [formGroup]="createForm" (ngSubmit)="onCreate()">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label class="block text-xs uppercase text-subtle">Código</label>
              <input formControlName="code" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs uppercase text-subtle">Nombre</label>
              <input formControlName="name" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs uppercase text-subtle">Precio mensual (COP)</label>
              <input type="number" formControlName="priceMonthly" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs uppercase text-subtle">Precio anual (COP)</label>
              <input type="number" formControlName="priceYearly" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs uppercase text-subtle">Máx. usuarios (vacío = ilimitado)</label>
              <input type="number" formControlName="maxUsers" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs uppercase text-subtle">Máx. procesos activos</label>
              <input type="number" formControlName="maxActiveProcesses" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs uppercase text-subtle">Máx. storage (MB)</label>
              <input type="number" formControlName="maxStorageMb" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
          </div>
          <div class="mt-4 flex flex-wrap gap-4 text-sm text-text">
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="chatbot" /> Chatbot</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="clientPortal" /> Portal del cliente</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="advancedReports" /> Reportes avanzados</label>
          </div>
          <button
            type="submit"
            class="mt-4 rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="createForm.invalid || isSaving()"
          >
            Crear plan
          </button>
        </form>
      }

      <div class="overflow-x-auto rounded-lg border border-default bg-surface">
        <table class="w-full text-left text-sm">
          <thead class="bg-surface-muted text-xs uppercase text-subtle">
            <tr>
              <th class="px-4 py-2">Código</th>
              <th class="px-4 py-2">Nombre</th>
              <th class="px-4 py-2">Mensual</th>
              <th class="px-4 py-2">Anual</th>
              <th class="px-4 py-2">Estado</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            @for (plan of plans(); track plan.id) {
              <tr class="border-t border-default">
                <td class="px-4 py-2 text-text">{{ plan.code }}</td>
                <td class="px-4 py-2 text-text">{{ plan.name }}</td>
                <td class="px-4 py-2 text-subtle">{{ formatPrice(plan.priceMonthly) }}</td>
                <td class="px-4 py-2 text-subtle">{{ formatPrice(plan.priceYearly) }}</td>
                <td class="px-4 py-2">
                  <span [class]="statusClasses(plan.isActive)">{{ plan.isActive ? 'Activo' : 'Inactivo' }}</span>
                </td>
                <td class="px-4 py-2 text-right">
                  @if (plan.isActive) {
                    <button type="button" class="text-sm font-medium text-danger hover:underline" (click)="deactivate(plan)">
                      Desactivar
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AdminPlansComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly platformAdminService = inject(PlatformAdminService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  readonly plans = signal<AdminPlan[]>([]);
  readonly isSaving = signal(false);
  readonly showCreateForm = signal(false);

  readonly createForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    priceMonthly: [0, [Validators.required, Validators.min(0)]],
    priceYearly: [0, [Validators.required, Validators.min(0)]],
    maxUsers: [null as number | null],
    maxActiveProcesses: [null as number | null],
    maxStorageMb: [null as number | null],
    chatbot: [false],
    clientPortal: [false],
    advancedReports: [false],
  });

  ngOnInit(): void {
    this.loadPlans();
  }

  private loadPlans(): void {
    this.platformAdminService.listPlans().subscribe({
      next: (plans) => this.plans.set(plans),
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  }

  statusClasses(isActive: boolean): string {
    const base = 'rounded-full px-2 py-1 text-xs font-medium';
    return isActive ? `${base} bg-success/15 text-success` : `${base} bg-surface-muted text-subtle`;
  }

  onCreate(): void {
    if (this.createForm.invalid || this.isSaving()) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.getRawValue();
    this.isSaving.set(true);
    this.platformAdminService
      .createPlan({
        code: value.code,
        name: value.name,
        priceMonthly: value.priceMonthly,
        priceYearly: value.priceYearly,
        currency: 'COP',
        maxUsers: value.maxUsers,
        maxActiveProcesses: value.maxActiveProcesses,
        maxStorageMb: value.maxStorageMb,
        sortOrder: this.plans().length,
        features: {
          chatbot: value.chatbot,
          clientPortal: value.clientPortal,
          advancedReports: value.advancedReports,
        },
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showCreateForm.set(false);
          this.createForm.reset({ priceMonthly: 0, priceYearly: 0, chatbot: false, clientPortal: false, advancedReports: false });
          this.toast.success('Plan creado correctamente.');
          this.loadPlans();
        },
        error: (error: Error) => {
          this.isSaving.set(false);
          this.toast.error(error.message);
        },
      });
  }

  async deactivate(plan: AdminPlan): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Desactivar plan',
      message: `${plan.name} dejará de estar disponible para nuevas contrataciones. Los tenants que ya lo tengan no se ven afectados.`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.platformAdminService.deactivatePlan(plan.id).subscribe({
      next: () => {
        this.toast.success('Plan desactivado.');
        this.loadPlans();
      },
      error: (error: Error) => this.toast.error(error.message),
    });
  }
}
