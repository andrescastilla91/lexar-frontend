import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClientPortalInvitationsService } from '../services/client-portal-invitations.service';
import { SubscriptionService } from '../services/subscription.service';
import { PlanUpgradeService } from '../services/plan-upgrade.service';
import { ClientPortalInvitationSummary } from '../models/portal.model';
import { HasPermissionDirective } from '../directives/has-permission.directive';
import { ToastService } from '../services/toast.service';

/**
 * F16 (A3.2): "invitar al portal" desde el detalle del cliente. Gestiona su
 * propio estado (patrón app-entity-files) para poder incrustarse en el
 * panel lateral de app-client-form sin acoplar al contenedor de clientes.
 */
@Component({
  selector: 'app-client-portal-invitations',
  standalone: true,
  imports: [FormsModule, RouterLink, HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *hasPermission="['clients.view']">
      @if (isLoadingEntitlements()) {
        <p class="text-xs text-subtle">Cargando…</p>
      } @else if (!hasClientPortalFeature()) {
        <div class="rounded-md border border-default bg-surface-muted p-3 text-xs text-subtle">
          El portal del cliente no está incluido en tu plan actual.
          <a
            routerLink="/configuracion"
            [queryParams]="{ tab: 'plan' }"
            class="font-semibold text-info hover:underline"
          >
            Actualizar plan
          </a>
        </div>
      } @else {
        @if (isLoadingList()) {
          <p class="text-xs text-subtle">Cargando accesos…</p>
        } @else {
          @if (invitations().length > 0) {
            <ul class="mb-3 space-y-2">
              @for (invitation of invitations(); track invitation.id) {
                <li class="flex items-center justify-between gap-2 rounded-md border border-default bg-surface px-3 py-2">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-xs font-medium text-text">{{ invitation.email }}</p>
                    <span
                      class="text-[11px] font-semibold"
                      [class.text-success]="invitation.status === 'activo'"
                      [class.text-warning]="invitation.status === 'pendiente'"
                    >
                      {{ invitation.status === 'activo' ? 'Activo' : 'Pendiente de activación' }}
                    </span>
                  </div>
                  @if (invitation.status === 'pendiente') {
                    <button
                      type="button"
                      *hasPermission="['clients.invite-portal']"
                      (click)="resend(invitation)"
                      [disabled]="resendingId() === invitation.id"
                      class="shrink-0 rounded-md border border-default px-2 py-1 text-[11px] font-semibold text-muted transition hover:bg-surface-muted disabled:opacity-50"
                    >
                      Reenviar
                    </button>
                  }
                </li>
              }
            </ul>
          } @else {
            <p class="mb-3 text-xs text-subtle">Este cliente aún no tiene acceso al portal.</p>
          }

          <form *hasPermission="['clients.invite-portal']" class="flex gap-2" (ngSubmit)="invite()">
            <input
              type="email"
              name="portalInviteEmail"
              [(ngModel)]="inviteEmail"
              placeholder="correo@cliente.com"
              required
              class="min-w-0 flex-1 rounded-md border border-default px-2.5 py-1.5 text-xs text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
            <button
              type="submit"
              [disabled]="isInviting() || !inviteEmail.trim()"
              class="shrink-0 rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
            >
              Invitar
            </button>
          </form>
          @if (errorMessage()) {
            <p class="mt-2 text-xs text-danger">{{ errorMessage() }}</p>
          }
        }
      }
    </div>
  `,
})
export class ClientPortalInvitationsComponent implements OnInit {
  clientId = input.required<string>();

  private readonly portalInvitationsService = inject(ClientPortalInvitationsService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly planUpgrade = inject(PlanUpgradeService);
  private readonly toastService = inject(ToastService);

  readonly invitations = signal<ClientPortalInvitationSummary[]>([]);
  readonly isLoadingList = signal(false);
  readonly isLoadingEntitlements = signal(true);
  readonly hasClientPortalFeature = signal(false);
  readonly isInviting = signal(false);
  readonly resendingId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  inviteEmail = '';

  ngOnInit(): void {
    this.subscriptionService.getEntitlements().subscribe({
      next: (entitlements) => {
        this.hasClientPortalFeature.set(entitlements.features.clientPortal);
        this.isLoadingEntitlements.set(false);
        if (entitlements.features.clientPortal) {
          this.loadInvitations();
        }
      },
      error: () => {
        this.hasClientPortalFeature.set(false);
        this.isLoadingEntitlements.set(false);
      },
    });
  }

  loadInvitations(): void {
    this.isLoadingList.set(true);
    this.portalInvitationsService.list(this.clientId()).subscribe({
      next: (response) => {
        this.invitations.set(response.portalUsers);
        this.isLoadingList.set(false);
      },
      error: () => {
        this.isLoadingList.set(false);
      },
    });
  }

  invite(): void {
    if (this.isInviting() || !this.inviteEmail.trim()) {
      return;
    }
    this.isInviting.set(true);
    this.errorMessage.set(null);

    this.portalInvitationsService.invite(this.clientId(), this.inviteEmail.trim()).subscribe({
      next: () => {
        this.inviteEmail = '';
        this.isInviting.set(false);
        this.toastService.success('Invitación al portal enviada');
        this.loadInvitations();
      },
      error: (error) => {
        this.isInviting.set(false);
        // F7-R3: el toast+CTA de upgrade ya lo dispara error.interceptor.ts
        // de forma centralizada — aquí no hay nada local que limpiar.
        if (this.planUpgrade.isPlanGateError(error)) {
          return;
        }
        // BUG-20 ola 1: error.message ya es el mensaje real y seguro que
        // calculó error.interceptor.ts (BUG-19) — error.error?.message lee
        // el body crudo, sin sus reglas de seguridad. Además faltaba el
        // toast (solo se mostraba inline).
        const message = error.message || 'Error al invitar al cliente';
        this.errorMessage.set(message);
        this.toastService.error(message);
      },
    });
  }

  resend(invitation: ClientPortalInvitationSummary): void {
    if (this.resendingId()) {
      return;
    }
    this.resendingId.set(invitation.id);
    this.portalInvitationsService.resend(this.clientId(), invitation.id).subscribe({
      next: () => {
        this.resendingId.set(null);
        this.toastService.success('Invitación reenviada');
      },
      error: (error) => {
        this.resendingId.set(null);
        // BUG-20 ola 1: ver comentario en invite() — error.message, no
        // error.error?.message.
        this.toastService.error(error.message || 'Error al reenviar la invitación');
      },
    });
  }
}
