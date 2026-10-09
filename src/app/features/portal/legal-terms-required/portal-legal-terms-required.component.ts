import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PortalAuthService } from '../../../core/services/portal-auth.service';
import { PortalLegalDocumentsService } from '../../../core/services/portal-legal-documents.service';
import { PendingLegalDocument } from '../../../core/models/legal-document.model';

@Component({
  selector: 'app-portal-legal-terms-required',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-muted via-surface to-surface-sunken px-4 py-12 sm:px-6">
      <div class="w-full max-w-lg rounded-lg border border-default bg-surface p-6 text-center shadow-raised sm:p-8">
        <p class="text-xs uppercase tracking-[0.3em] text-subtle">LexAr · Portal del cliente</p>
        <h1 class="mt-2 text-2xl font-semibold text-text">Términos del portal</h1>
        <p class="mt-2 text-sm text-subtle">
          Para consultar tus procesos y documentos debes aceptar los términos de uso vigentes del portal.
        </p>

        @if (isLoading()) {
          <p class="mt-6 text-sm text-subtle">Cargando documento…</p>
        } @else if (pendingDocument(); as doc) {
          <div class="mt-6 rounded-md border border-default bg-surface-alt p-4 text-left">
            <p class="break-words text-sm font-medium text-text">{{ doc.originalFilename }}</p>
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
export class PortalLegalTermsRequiredComponent implements OnInit {
  private readonly portalAuthService = inject(PortalAuthService);
  private readonly portalLegalDocumentsService = inject(PortalLegalDocumentsService);
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

    this.portalLegalDocumentsService.getPendingAcceptance().subscribe({
      next: (res) => {
        this.pendingDocument.set(res.pending);
        this.isLoading.set(false);
        if (!res.pending) {
          this.portalAuthService.patchCurrentPortalUser({ legalTermsPending: false });
          this.router.navigateByUrl('/portal/procesos');
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

    this.portalLegalDocumentsService.accept(documentId).subscribe({
      next: () => {
        this.portalAuthService.patchCurrentPortalUser({ legalTermsPending: false });
        this.isAccepting.set(false);
        this.router.navigateByUrl('/portal/procesos');
      },
      error: (error) => {
        this.acceptError.set(error.message || 'No pudimos registrar tu aceptación. Intenta de nuevo.');
        this.isAccepting.set(false);
      },
    });
  }

  logout(): void {
    this.portalAuthService.logout().subscribe(() => this.router.navigate(['/portal/login']));
  }
}
