import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminSubscriptionAction, TenantDetail, TenantSummary } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-tenants',
  standalone: true,
  imports: [DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">
      <h1 class="text-xl font-semibold text-text">Tenants</h1>

      @if (isLoading()) {
        <p class="text-sm text-subtle">Cargando tenants…</p>
      } @else {
        <div class="overflow-x-auto rounded-lg border border-default bg-surface">
          <table class="w-full text-left text-sm">
            <thead class="bg-surface-muted text-xs uppercase text-subtle">
              <tr>
                <th class="px-4 py-2">Empresa</th>
                <th class="px-4 py-2">Plan</th>
                <th class="px-4 py-2">Estado</th>
                <th class="px-4 py-2">Usuarios</th>
                <th class="px-4 py-2">Storage (MB)</th>
                <th class="px-4 py-2">Creada</th>
                <th class="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              @for (tenant of tenants(); track tenant.id) {
                <tr class="border-t border-default">
                  <td class="px-4 py-2 text-text">{{ tenant.legalName }}</td>
                  <td class="px-4 py-2 text-subtle">{{ tenant.planName }}</td>
                  <td class="px-4 py-2">
                    <span [class]="statusClasses(tenant.subscriptionStatus)">{{ tenant.subscriptionStatus }}</span>
                  </td>
                  <td class="px-4 py-2 text-subtle">{{ tenant.userCount }}</td>
                  <td class="px-4 py-2 text-subtle">{{ tenant.storageMb }}</td>
                  <td class="px-4 py-2 text-subtle">{{ tenant.createdAt | date: 'd MMM y' }}</td>
                  <td class="px-4 py-2 text-right">
                    <button type="button" class="text-sm font-medium text-navy-900 hover:underline" (click)="selectTenant(tenant.id)">
                      Ver detalle
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (selectedTenant(); as tenant) {
        <div class="rounded-lg border border-default bg-surface p-5 shadow-card">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-text">{{ tenant.legalName }}</h2>
            <button type="button" class="text-sm text-subtle hover:underline" (click)="closeDetail()">Cerrar</button>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p class="text-xs uppercase text-subtle">Plan</p>
              <p class="text-text">{{ tenant.planName }} ({{ tenant.subscriptionStatus }})</p>
            </div>
            <div>
              <p class="text-xs uppercase text-subtle">Usuarios / procesos activos</p>
              <p class="text-text">
                {{ tenant.userCount }}{{ tenant.limits.maxUsers !== null ? ' / ' + tenant.limits.maxUsers : '' }} ·
                {{ tenant.activeProcesses }}{{ tenant.limits.maxActiveProcesses !== null ? ' / ' + tenant.limits.maxActiveProcesses : '' }}
              </p>
            </div>
            <div>
              <p class="text-xs uppercase text-subtle">Vence</p>
              <p class="text-text">{{ tenant.currentPeriodEnd | date: 'd MMM y' }}</p>
            </div>
          </div>

          <div class="mt-6 border-t border-default pt-4">
            <h3 class="text-sm font-semibold text-text">Gestionar suscripción</h3>
            <div class="mt-3 flex flex-wrap items-end gap-3">
              <select
                [(ngModel)]="subscriptionAction"
                class="rounded-md border border-default bg-surface px-3 py-2 text-sm text-text"
              >
                <option value="change_plan">Cambiar de plan</option>
                <option value="extend_trial">Extender trial</option>
                <option value="suspend">Suspender</option>
                <option value="reactivate">Reactivar</option>
              </select>

              @if (subscriptionAction() === 'change_plan') {
                <input
                  [(ngModel)]="planCodeInput"
                  placeholder="Código de plan (ej. FIRMA)"
                  class="rounded-md border border-default bg-surface px-3 py-2 text-sm text-text"
                />
              }
              @if (subscriptionAction() === 'extend_trial') {
                <input
                  type="number"
                  [(ngModel)]="daysInput"
                  min="1"
                  placeholder="Días"
                  class="w-24 rounded-md border border-default bg-surface px-3 py-2 text-sm text-text"
                />
              }

              <button
                type="button"
                class="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                [disabled]="isUpdatingSubscription()"
                (click)="applySubscriptionAction(tenant.id)"
              >
                Aplicar
              </button>
            </div>
          </div>

          <div class="mt-6 border-t border-default pt-4">
            <h3 class="text-sm font-semibold text-text">Usuarios (impersonación)</h3>
            <ul class="mt-3 space-y-2">
              @for (user of tenant.users; track user.id) {
                <li class="flex items-center justify-between rounded-md border border-default px-3 py-2 text-sm">
                  <span class="text-text">{{ user.firstName }} {{ user.lastName }} — {{ user.email }}</span>
                  <button
                    type="button"
                    class="text-sm font-medium text-navy-900 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    [disabled]="!user.isActive"
                    (click)="impersonate(tenant.id, user.id)"
                  >
                    Impersonar
                  </button>
                </li>
              }
            </ul>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminTenantsComponent implements OnInit {
  private readonly platformAdminService = inject(PlatformAdminService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly isLoading = signal(true);
  readonly tenants = signal<TenantSummary[]>([]);
  readonly selectedTenant = signal<TenantDetail | null>(null);
  readonly isUpdatingSubscription = signal(false);

  readonly subscriptionAction = signal<AdminSubscriptionAction>('change_plan');
  readonly planCodeInput = signal('');
  readonly daysInput = signal<number | null>(7);

  ngOnInit(): void {
    this.platformAdminService.listTenants().subscribe({
      next: (tenants) => {
        this.tenants.set(tenants);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  selectTenant(id: string): void {
    this.platformAdminService.getTenant(id).subscribe({
      next: (tenant) => this.selectedTenant.set(tenant),
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  closeDetail(): void {
    this.selectedTenant.set(null);
  }

  statusClasses(status: string): string {
    const base = 'rounded-full px-2 py-1 text-xs font-medium';
    if (status === 'active') {
      return `${base} bg-success/15 text-success`;
    }
    if (status === 'suspended' || status === 'past_due') {
      return `${base} bg-danger/15 text-danger`;
    }
    return `${base} bg-surface-muted text-subtle`;
  }

  async applySubscriptionAction(tenantId: string): Promise<void> {
    if (this.isUpdatingSubscription()) {
      return;
    }

    const action = this.subscriptionAction();
    if (action === 'suspend' || action === 'reactivate') {
      const confirmed = await this.confirmDialog.confirm({
        title: action === 'suspend' ? 'Suspender tenant' : 'Reactivar tenant',
        message:
          action === 'suspend'
            ? 'El tenant perderá acceso de escritura de inmediato. ¿Continuar?'
            : '¿Reactivar el acceso completo de este tenant?',
        danger: action === 'suspend',
      });
      if (!confirmed) {
        return;
      }
    }

    this.isUpdatingSubscription.set(true);
    this.platformAdminService
      .updateSubscription(tenantId, {
        action,
        planCode: action === 'change_plan' ? this.planCodeInput() : undefined,
        days: action === 'extend_trial' ? (this.daysInput() ?? undefined) : undefined,
      })
      .subscribe({
        next: (result) => {
          this.isUpdatingSubscription.set(false);
          this.toast.success(result.message);
          this.selectTenant(tenantId);
          this.refreshList();
        },
        error: (error: Error) => {
          this.isUpdatingSubscription.set(false);
          this.toast.error(error.message);
        },
      });
  }

  async impersonate(tenantId: string, userId: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Iniciar impersonación',
      message:
        'Vas a operar la cuenta de este usuario tal como él la ve. La sesión expira sola en 30 minutos y queda registrada en auditoría.',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.platformAdminService.impersonate(tenantId, userId).subscribe({
      next: () => {
        this.toast.success('Impersonación iniciada');
        this.router.navigate(['/dashboard']);
      },
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  private refreshList(): void {
    this.platformAdminService.listTenants().subscribe({
      next: (tenants) => this.tenants.set(tenants),
    });
  }
}
