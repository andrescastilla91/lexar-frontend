import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { AvatarComponent } from '../../../core/components/avatar.component';
import { AdvisorResponse, AdvisorStatus } from '../../../core/models/advisor-backend.model';
import { getAdvisorFullName, getAdvisorInitials } from '../utils/advisor-format.utils';

const STATUS_LABELS: Record<AdvisorStatus, string> = {
  [AdvisorStatus.AVAILABLE]: 'Disponible',
  [AdvisorStatus.IN_HEARING]: 'En audiencia',
  [AdvisorStatus.IN_MEETING]: 'En reunión',
  [AdvisorStatus.BUSY]: 'Ocupado',
};

@Component({
  selector: 'app-advisors-table',
  standalone: true,
  imports: [HasPermissionDirective, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoading()) {
      <div class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
      </div>
    } @else if (advisors().length === 0) {
      <div class="rounded-lg border border-default bg-surface p-12 text-center">
        <svg class="mx-auto h-16 w-16 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 class="mt-4 text-lg font-semibold text-text">No hay asesores registrados</h3>
        <p class="mt-2 text-sm text-subtle">{{ emptyMessage() }}</p>
      </div>
    } @else {
      <div class="hidden md:block rounded-lg border border-default bg-surface shadow-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
          <thead class="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th class="px-6 py-4">Asesor</th>
              <th class="px-6 py-4">Contacto</th>
              <th class="px-6 py-4">Especialidad</th>
              <th class="px-6 py-4">Experiencia</th>
              <th class="px-6 py-4">Estado</th>
              <th class="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            @for (advisor of advisors(); track advisor.id) {
              <tr class="transition hover:bg-surface-muted">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <app-avatar [url]="advisor.user?.avatarUrl ?? null" [initials]="getAdvisorInitials(advisor)" [size]="40" />
                    <div>
                      <p class="font-semibold text-text">{{ getAdvisorFullName(advisor) }}</p>
                      <p class="text-sm text-subtle">{{ advisor.user?.email || 'Sin email' }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm text-muted">
                  {{ advisor.phone || 'N/A' }}
                </td>
                <td class="px-6 py-4">
                  <p class="text-sm font-medium text-text">{{ advisor.specialty?.label || 'N/A' }}</p>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3 text-sm">
                    <span class="text-muted">{{ advisor.experienceYears }} años</span>
                    @if (advisor.rating && advisor.rating > 0) {
                      <span class="flex items-center gap-1 text-warning">
                        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="m10 15.27 5.18 3.05-1.64-5.81L18 8.97l-6-.21L10 3l-2 5.76-6 .21 4.46 3.54L6.82 18z" />
                        </svg>
                        {{ advisor.rating.toFixed(1) }}
                      </span>
                    }
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                    [class]="statusClasses(advisor.status)"
                  >
                    <span class="h-2 w-2 rounded-full" [class]="dotClasses(advisor.status)"></span>
                    {{ getStatusLabel(advisor.status) }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex justify-end gap-2">
                    <button
                      *hasPermission="'advisors.edit'"
                      type="button"
                      (click)="edit.emit(advisor)"
                      class="rounded-lg p-2 text-subtle hover:bg-surface-muted hover:text-text"
                      title="Editar"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 3.487 3.65 3.65a1 1 0 0 1 0 1.415L8.96 20.104a1 1 0 0 1-.708.292H4.5a.75.75 0 0 1-.75-.75v-3.752a1 1 0 0 1 .293-.707L15.447 3.487a1 1 0 0 1 1.415 0Z" />
                      </svg>
                    </button>
                    <button
                      *hasPermission="['advisors.activate', 'advisors.deactivate']"
                      type="button"
                      (click)="toggleStatus.emit(advisor)"
                      class="rounded-lg p-2 transition"
                      [class]="advisor.isActive ? 'text-warning hover:bg-warning-tint' : 'text-success hover:bg-success-tint'"
                      [title]="advisor.isActive ? 'Desactivar' : 'Activar'"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        @if (advisor.isActive) {
                          <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        } @else {
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        }
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
        </div>
      </div>

      <div class="grid gap-4 md:hidden">
        @for (advisor of advisors(); track advisor.id) {
          <div class="rounded-lg border border-default bg-surface p-4 shadow-card">
            <div class="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div class="flex min-w-0 items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                  {{ getAdvisorInitials(advisor) }}
                </div>
                <div class="min-w-0">
                  <p class="truncate font-semibold text-text">{{ getAdvisorFullName(advisor) }}</p>
                  <p class="truncate text-sm text-subtle">{{ advisor.user?.email || 'Sin email' }}</p>
                </div>
              </div>
              <span
                class="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold"
                [class]="statusClasses(advisor.status)"
              >
                <span class="h-2 w-2 rounded-full" [class]="dotClasses(advisor.status)"></span>
                {{ getStatusLabel(advisor.status) }}
              </span>
            </div>

            <div class="mb-3 space-y-2 text-sm">
              <div>
                <span class="text-xs font-medium text-subtle">Teléfono:</span>
                <span class="ml-2 text-xs text-muted">{{ advisor.phone || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-xs font-medium text-subtle">Especialidad:</span>
                <span class="ml-2 text-xs text-muted">{{ advisor.specialty?.label || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-xs font-medium text-subtle">Experiencia:</span>
                <span class="ml-2 text-xs text-muted">{{ advisor.experienceYears }} años</span>
                @if (advisor.rating && advisor.rating > 0) {
                  <span class="ml-2 inline-flex items-center gap-1 text-warning">
                    <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="m10 15.27 5.18 3.05-1.64-5.81L18 8.97l-6-.21L10 3l-2 5.76-6 .21 4.46 3.54L6.82 18z" />
                    </svg>
                    {{ advisor.rating.toFixed(1) }}
                  </span>
                }
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button
                *hasPermission="'advisors.edit'"
                type="button"
                (click)="edit.emit(advisor)"
                class="rounded-md border border-default px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface-muted"
              >
                Editar
              </button>
              <button
                *hasPermission="['advisors.activate', 'advisors.deactivate']"
                type="button"
                (click)="toggleStatus.emit(advisor)"
                class="rounded-md border px-4 py-2 text-xs font-semibold transition"
                [class]="advisor.isActive ? 'border-warning text-warning hover:bg-warning-tint' : 'border-success text-success hover:bg-success-tint'"
              >
                {{ advisor.isActive ? 'Desactivar' : 'Activar' }}
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class AdvisorsTableComponent {
  protected readonly getAdvisorFullName = getAdvisorFullName;
  protected readonly getAdvisorInitials = getAdvisorInitials;

  advisors = input.required<AdvisorResponse[]>();
  isLoading = input(false);
  emptyMessage = input('Comienza agregando tu primer asesor legal al equipo');

  edit = output<AdvisorResponse>();
  toggleStatus = output<AdvisorResponse>();

  getStatusLabel(status: AdvisorStatus): string {
    return STATUS_LABELS[status] || status;
  }

  statusClasses(status: AdvisorStatus): string {
    switch (status) {
      case AdvisorStatus.AVAILABLE:
        return 'bg-success-tint text-success';
      case AdvisorStatus.IN_HEARING:
        return 'bg-warning-tint text-warning';
      case AdvisorStatus.IN_MEETING:
        return 'bg-info-tint text-info';
      case AdvisorStatus.BUSY:
        return 'bg-surface-muted text-muted';
      default:
        return 'bg-surface-muted text-muted';
    }
  }

  dotClasses(status: AdvisorStatus): string {
    switch (status) {
      case AdvisorStatus.AVAILABLE:
        return 'bg-success';
      case AdvisorStatus.IN_HEARING:
        return 'bg-warning';
      case AdvisorStatus.IN_MEETING:
        return 'bg-primary';
      case AdvisorStatus.BUSY:
        return 'bg-strong';
      default:
        return 'bg-strong';
    }
  }
}
