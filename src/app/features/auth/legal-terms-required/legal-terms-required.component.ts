import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LegalDocumentsService } from '../../../core/services/legal-documents.service';
import { PendingLegalDocument } from '../../../core/models/legal-document.model';

/**
 * F44 §LEG-01 (ola 2): pantalla bloqueante del gate de términos — mismo
 * patrón que `TwoFactorRequiredComponent`/`/verificar-pendiente`: ruta
 * propia fuera del layout autenticado (solo `authGuard`), con salida
 * digna vía "Cerrar sesión". `legalTermsRequiredGuard` redirige aquí.
 */
@Component({
  selector: 'app-legal-terms-required',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-surface-muted px-6 py-12">
      <div class="w-full max-w-lg rounded-lg border border-default bg-surface p-8 text-center shadow-card">
        <h1 class="text-2xl font-semibold text-text">Términos de uso actualizados</h1>
        <p class="mt-2 text-sm text-subtle">
          Debes aceptar la versión vigente de nuestros términos internos antes de continuar.
        </p>

        @if (isLoading()) {
          <p class="mt-6 text-sm text-subtle">Cargando documento…</p>
        } @else if (pendingDocument(); as doc) {
          <div class="mt-6 rounded-md border border-default bg-surface-alt p-4 text-left">
            <p class="text-sm font-medium text-text">{{ doc.originalFilename }}</p>
            <p class="text-xs text-subtle">Versión {{ doc.version }}</p>
            <a
              [href]="doc.downloadUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-2 inline-block text-sm font-medium text-navy-900 hover:underline"
            >
              Ver documento completo
            </a>
          </div>

          @if (acceptError()) {
            <p class="mt-4 text-sm text-danger">{{ acceptError() }}</p>
          }

          <button
            type="button"
            class="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-navy-900 px-4 py-3 text-base font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-navy-900/40 disabled:cursor-not-allowed disabled:bg-strong"
            [disabled]="isAccepting()"
            (click)="accept(doc.id)"
          >
            Acepto los términos
          </button>
        } @else if (loadError()) {
          <p class="mt-6 text-sm text-danger">{{ loadError() }}</p>
        }

        <button
          type="button"
          class="mt-4 w-full text-center text-sm font-medium text-subtle hover:underline"
          (click)="logout()"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  `,
})
export class LegalTermsRequiredComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly legalDocumentsService = inject(LegalDocumentsService);
  private readonly router = inject(Router);

  readonly isLoading = signal(true);
  readonly pendingDocument = signal<PendingLegalDocument | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly isAccepting = signal(false);
  readonly acceptError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPending();
  }

  private loadPending(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.legalDocumentsService.getPendingAcceptance().subscribe({
      next: (res) => {
        this.pendingDocument.set(res.pending);
        this.isLoading.set(false);
        if (!res.pending) {
          // Ya no hay nada pendiente (otra pestaña lo aceptó, o se
          // desactivó el documento) — no lo dejamos varado aquí.
          this.router.navigateByUrl('/dashboard');
        }
      },
      error: (error) => {
        this.loadError.set(error.message || 'No pudimos cargar el documento pendiente.');
        this.isLoading.set(false);
      },
    });
  }

  accept(documentId: string): void {
    if (this.isAccepting()) {
      return;
    }

    this.isAccepting.set(true);
    this.acceptError.set(null);

    this.legalDocumentsService.accept(documentId).subscribe({
      next: () => {
        this.authService.patchCurrentUser({ legalTermsPending: false });
        this.isAccepting.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: (error) => {
        this.acceptError.set(error.message || 'No pudimos registrar tu aceptación. Intenta de nuevo.');
        this.isAccepting.set(false);
      },
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
