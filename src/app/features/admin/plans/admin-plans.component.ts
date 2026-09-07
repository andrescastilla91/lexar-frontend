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
          (click)="toggleCreateForm()"
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
            <div>
              <label class="block text-xs uppercase text-subtle">Cupo IA / mes</label>
              <input type="number" formControlName="aiCreditsMonth" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs uppercase text-subtle">Máx. clientes en portal (vacío = ilimitado)</label>
              <input type="number" formControlName="portalClientsMax" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
          </div>
          <div class="mt-4 flex flex-wrap gap-4 text-sm text-text">
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="chatbot" /> Chatbot</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="clientPortal" /> Portal del cliente</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="advancedReports" /> Reportes avanzados</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="taskApprovals" /> Aprobaciones de tareas</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="customCatalogs" /> Catálogos personalizables</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="mandatory2faPolicy" /> Política 2FA obligatoria</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="exportableReports" /> Reportes exportables</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="exportableAudit" /> Auditoría exportable</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="earlyAccess" /> Early access</label>
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

      @if (editingPlanId()) {
        <form class="rounded-lg border border-default bg-surface p-5" [formGroup]="editForm" (ngSubmit)="onUpdate()">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-text">Editar plan {{ editingPlanCode() }}</h2>
            <button type="button" class="text-sm text-subtle hover:underline" (click)="cancelEdit()">Cancelar</button>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <div>
              <label class="block text-xs uppercase text-subtle">Cupo IA / mes</label>
              <input type="number" formControlName="aiCreditsMonth" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs uppercase text-subtle">Máx. clientes en portal (vacío = ilimitado)</label>
              <input type="number" formControlName="portalClientsMax" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
          </div>
          <div class="mt-4 flex flex-wrap gap-4 text-sm text-text">
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="chatbot" /> Chatbot</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="clientPortal" /> Portal del cliente</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="advancedReports" /> Reportes avanzados</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="taskApprovals" /> Aprobaciones de tareas</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="customCatalogs" /> Catálogos personalizables</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="mandatory2faPolicy" /> Política 2FA obligatoria</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="exportableReports" /> Reportes exportables</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="exportableAudit" /> Auditoría exportable</label>
            <label class="flex items-center gap-2"><input type="checkbox" formControlName="earlyAccess" /> Early access</label>
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
                  <button type="button" class="mr-4 text-sm font-medium text-navy-900 hover:underline" (click)="startEdit(plan)">
                    Editar
                  </button>
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
  readonly editingPlanId = signal<string | null>(null);
  readonly editingPlanCode = signal<string | null>(null);

  readonly createForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    priceMonthly: [0, [Validators.required, Validators.min(0)]],
    priceYearly: [0, [Validators.required, Validators.min(0)]],
    maxUsers: [null as number | null],
    maxActiveProcesses: [null as number | null],
    maxStorageMb: [null as number | null],
    aiCreditsMonth: [0, [Validators.required, Validators.min(0)]],
    portalClientsMax: [null as number | null],
    chatbot: [false],
    clientPortal: [false],
    advancedReports: [false],
    taskApprovals: [false],
    customCatalogs: [false],
    mandatory2faPolicy: [false],
    exportableReports: [false],
    exportableAudit: [false],
    earlyAccess: [false],
  });

  // Edición de un plan existente (código inmutable — coincide con
  // UpdatePlanRequest = Partial<Omit<AdminPlan, 'id' | 'code'>> del backend).
  // Antes de este cambio la pantalla solo permitía crear/desactivar planes;
  // el servicio y el endpoint PATCH admin/plans/:id ya existían pero nunca
  // se conectaron a la UI.
  readonly editForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    priceMonthly: [0, [Validators.required, Validators.min(0)]],
    priceYearly: [0, [Validators.required, Validators.min(0)]],
    maxUsers: [null as number | null],
    maxActiveProcesses: [null as number | null],
    maxStorageMb: [null as number | null],
    aiCreditsMonth: [0, [Validators.required, Validators.min(0)]],
    portalClientsMax: [null as number | null],
    chatbot: [false],
    clientPortal: [false],
    advancedReports: [false],
    taskApprovals: [false],
    customCatalogs: [false],
    mandatory2faPolicy: [false],
    exportableReports: [false],
    exportableAudit: [false],
    earlyAccess: [false],
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

  toggleCreateForm(): void {
    this.editingPlanId.set(null);
    this.showCreateForm.set(!this.showCreateForm());
  }

  startEdit(plan: AdminPlan): void {
    this.showCreateForm.set(false);
    this.editingPlanId.set(plan.id);
    this.editingPlanCode.set(plan.code);
    this.editForm.reset({
      name: plan.name,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      maxUsers: plan.maxUsers,
      maxActiveProcesses: plan.maxActiveProcesses,
      maxStorageMb: plan.maxStorageMb,
      aiCreditsMonth: plan.aiCreditsMonth,
      portalClientsMax: plan.portalClientsMax,
      chatbot: plan.features.chatbot,
      clientPortal: plan.features.clientPortal,
      advancedReports: plan.features.advancedReports,
      taskApprovals: plan.features.taskApprovals,
      customCatalogs: plan.features.customCatalogs,
      mandatory2faPolicy: plan.features.mandatory2faPolicy,
      exportableReports: plan.features.exportableReports,
      exportableAudit: plan.features.exportableAudit,
      earlyAccess: plan.features.earlyAccess,
    });
  }

  cancelEdit(): void {
    this.editingPlanId.set(null);
    this.editingPlanCode.set(null);
  }

  onUpdate(): void {
    const id = this.editingPlanId();
    if (!id || this.editForm.invalid || this.isSaving()) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.getRawValue();
    this.isSaving.set(true);
    this.platformAdminService
      .updatePlan(id, {
        name: value.name,
        priceMonthly: value.priceMonthly,
        priceYearly: value.priceYearly,
        maxUsers: value.maxUsers,
        maxActiveProcesses: value.maxActiveProcesses,
        maxStorageMb: value.maxStorageMb,
        aiCreditsMonth: value.aiCreditsMonth,
        portalClientsMax: value.portalClientsMax,
        features: {
          chatbot: value.chatbot,
          clientPortal: value.clientPortal,
          advancedReports: value.advancedReports,
          taskApprovals: value.taskApprovals,
          customCatalogs: value.customCatalogs,
          mandatory2faPolicy: value.mandatory2faPolicy,
          exportableReports: value.exportableReports,
          exportableAudit: value.exportableAudit,
          earlyAccess: value.earlyAccess,
        },
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.cancelEdit();
          this.toast.success('Plan actualizado correctamente.');
          this.loadPlans();
        },
        error: (error: Error) => {
          this.isSaving.set(false);
          this.toast.error(error.message);
        },
      });
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
        aiCreditsMonth: value.aiCreditsMonth,
        portalClientsMax: value.portalClientsMax,
        sortOrder: this.plans().length,
        features: {
          chatbot: value.chatbot,
          clientPortal: value.clientPortal,
          advancedReports: value.advancedReports,
          taskApprovals: value.taskApprovals,
          customCatalogs: value.customCatalogs,
          mandatory2faPolicy: value.mandatory2faPolicy,
          exportableReports: value.exportableReports,
          exportableAudit: value.exportableAudit,
          earlyAccess: value.earlyAccess,
        },
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showCreateForm.set(false);
          this.createForm.reset({
            priceMonthly: 0,
            priceYearly: 0,
            aiCreditsMonth: 0,
            chatbot: false,
            clientPortal: false,
            advancedReports: false,
            taskApprovals: false,
            customCatalogs: false,
            mandatory2faPolicy: false,
            exportableReports: false,
            exportableAudit: false,
            earlyAccess: false,
          });
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
