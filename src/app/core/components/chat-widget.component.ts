import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { SubscriptionService } from '../services/subscription.service';
import { AiChatPanelComponent } from './ai-chat-panel.component';

/**
 * HU-F20-1-b — botón flotante global (burbuja + panel) que abre el mismo
 * asistente IA de `/chatbot` desde cualquier pantalla, sin perder el
 * contexto de lo que el usuario estaba haciendo. Montado una sola vez en
 * `MainLayoutComponent`, así que solo aparece en el área interna
 * autenticada — nunca en el portal del cliente (`PortalLayoutComponent`)
 * ni en pantallas de auth (login/registro), que usan layouts distintos y
 * nunca renderizan `MainLayoutComponent`.
 *
 * Reutiliza `AiChatPanelComponent` (extraído de `ChatbotComponent` en
 * este mismo cambio) — misma conversación que la pantalla dedicada,
 * porque ambos instancian el panel, que carga su propio historial contra
 * `GET /ai/chat`, y el backend solo mantiene una conversación activa por
 * usuario (no hay estado que sincronizar entre instancias).
 *
 * El panel solo se instancia (y por lo tanto solo pide el historial)
 * cuando el usuario abre el widget — evita una llamada a la API en cada
 * carga de página solo por tener el botón montado.
 */
@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [AiChatPanelComponent],
  template: `
    @if (visible()) {
      @if (isOpen()) {
        <div
          class="fixed inset-0 z-40 flex flex-col overflow-hidden border-default bg-surface shadow-[var(--shadow-card)] sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[560px] sm:w-96 sm:rounded-3xl sm:border"
        >
          <div class="flex-1 overflow-hidden p-4">
            <app-ai-chat-panel [showCloseButton]="true" (closeRequested)="close()" />
          </div>
        </div>
      }

      <button
        type="button"
        class="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-[var(--shadow-card)] transition hover:bg-primary-hover"
        (click)="toggle()"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-label]="isOpen() ? 'Minimizar asistente' : 'Abrir asistente LexAr'"
      >
        @if (isOpen()) {
          <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path d="M6 18 18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        } @else {
          <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path
              d="M12 20.25c4.908 0 8.887-3.478 8.887-7.769 0-4.29-3.979-7.768-8.887-7.768-4.907 0-8.886 3.478-8.886 7.768a7.44 7.44 0 0 0 2.741 5.7L6 20.25v-2.292"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
          </svg>
        }
      </button>
    }
  `,
})
export class ChatWidgetComponent {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly router = inject(Router);

  // Mismo entitlement `chatbot` que gatea la ruta /chatbot y el ítem del
  // menú (ver chatbotFeatureGuard y MainLayoutComponent.chatbotEnabled) —
  // arranca en `false` para no parpadear el botón antes de la respuesta.
  private readonly entitled = signal(false);
  private readonly currentUrl = signal(this.router.url);
  readonly isOpen = signal(false);

  // No se muestra en /chatbot: sería un widget duplicado sobre la misma
  // pantalla que ya tiene el asistente como contenido principal.
  readonly visible = computed(() => this.entitled() && !this.currentUrl().startsWith('/chatbot'));

  constructor() {
    this.subscriptionService.getEntitlements().subscribe({
      next: (entitlements) => this.entitled.set(entitlements.features.chatbot),
      error: () => {},
    });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
