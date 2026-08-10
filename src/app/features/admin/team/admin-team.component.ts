import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { PlatformAdminSummary } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-team',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold text-text">Equipo LexAr (platform admins)</h1>
        <button type="button" class="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white" (click)="showCreateForm.set(!showCreateForm())">
          {{ showCreateForm() ? 'Cancelar' : 'Invitar nuevo' }}
        </button>
      </div>

      @if (showCreateForm()) {
        <form class="rounded-lg border border-default bg-surface p-5" [formGroup]="createForm" (ngSubmit)="onCreate()">
          <p class="text-xs text-subtle">Solo se permiten correos del dominio configurado en el servidor.</p>
          <div class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs uppercase text-subtle">Correo</label>
              <input type="email" formControlName="email" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" placeholder="nombre@lexar.com" />
            </div>
            <div>
              <label class="block text-xs uppercase text-subtle">Contraseña temporal</label>
              <input type="password" formControlName="password" class="mt-1 w-full rounded-md border border-default px-3 py-2 text-sm" />
            </div>
          </div>
          @if (createError()) {
            <p class="mt-3 text-sm text-danger">{{ createError() }}</p>
          }
          <button
            type="submit"
            class="mt-4 rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="createForm.invalid || isSaving()"
          >
            Crear platform admin
          </button>
        </form>
      }

      <div class="overflow-x-auto rounded-lg border border-default bg-surface">
        <table class="w-full text-left text-sm">
          <thead class="bg-surface-muted text-xs uppercase text-subtle">
            <tr>
              <th class="px-4 py-2">Correo</th>
              <th class="px-4 py-2">Creado</th>
              <th class="px-4 py-2">Estado</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            @for (admin of admins(); track admin.id) {
              <tr class="border-t border-default">
                <td class="px-4 py-2 text-text">{{ admin.email }}</td>
                <td class="px-4 py-2 text-subtle">{{ admin.createdAt | date: 'd MMM y' }}</td>
                <td class="px-4 py-2">
                  <span [class]="statusClasses(admin.isActive)">{{ admin.isActive ? 'Activo' : 'Inactivo' }}</span>
                </td>
                <td class="px-4 py-2 text-right">
                  @if (!isSelf(admin)) {
                    <button
                      type="button"
                      class="text-sm font-medium hover:underline"
                      [class.text-danger]="admin.isActive"
                      [class.text-success]="!admin.isActive"
                      (click)="toggleActive(admin)"
                    >
                      {{ admin.isActive ? 'Desactivar' : 'Activar' }}
                    </button>
                  } @else {
                    <span class="text-xs text-subtle">Tu cuenta</span>
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
export class AdminTeamComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly platformAdminService = inject(PlatformAdminService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  readonly admins = signal<PlatformAdminSummary[]>([]);
  readonly showCreateForm = signal(false);
  readonly isSaving = signal(false);
  readonly createError = signal<string | null>(null);

  readonly createForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.loadAdmins();
  }

  private loadAdmins(): void {
    this.platformAdminService.listPlatformAdmins().subscribe({
      next: (admins) => this.admins.set(admins),
      error: (error: Error) => this.toast.error(error.message),
    });
  }

  isSelf(admin: PlatformAdminSummary): boolean {
    return admin.email === this.platformAdminService.currentAdmin()?.email;
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

    this.isSaving.set(true);
    this.createError.set(null);
    this.platformAdminService.createPlatformAdmin(this.createForm.getRawValue()).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showCreateForm.set(false);
        this.createForm.reset();
        this.toast.success('Platform admin creado correctamente.');
        this.loadAdmins();
      },
      error: (error: Error) => {
        this.isSaving.set(false);
        this.createError.set(error.message);
      },
    });
  }

  async toggleActive(admin: PlatformAdminSummary): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: admin.isActive ? 'Desactivar platform admin' : 'Activar platform admin',
      message: admin.isActive
        ? `${admin.email} perderá acceso inmediato al panel de plataforma.`
        : `${admin.email} recuperará acceso al panel de plataforma.`,
      danger: admin.isActive,
    });
    if (!confirmed) {
      return;
    }

    this.platformAdminService.togglePlatformAdminActive(admin.id).subscribe({
      next: () => {
        this.toast.success('Estado actualizado.');
        this.loadAdmins();
      },
      error: (error: Error) => this.toast.error(error.message),
    });
  }
}
