import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

type VerifyEmailState = 'checking' | 'success' | 'error' | 'missing-token';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-surface-muted px-6 py-12">
      <div class="w-full max-w-md rounded-lg border border-default bg-white/80 p-8 text-center shadow-raised backdrop-blur">
        <h1 class="text-2xl font-semibold text-text">Verificación de correo</h1>

        @switch (state()) {
          @case ('checking') {
            <p class="mt-6 text-sm text-subtle">Verificando tu correo...</p>
          }
          @case ('success') {
            <div class="mt-6 rounded-md border border-default bg-surface px-4 py-3 text-sm text-text">
              Tu correo fue verificado exitosamente.
            </div>
          }
          @case ('missing-token') {
            <div class="mt-6 rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
              El enlace no incluye un token válido.
            </div>
          }
          @case ('error') {
            <div class="mt-6 rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
              {{ errorMessage() }}
            </div>
          }
        }

        <p class="mt-8 text-sm text-subtle">
          <a routerLink="/dashboard" class="font-semibold text-navy-900 hover:underline">Ir a LexAr</a>
        </p>
      </div>
    </div>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly state = signal<VerifyEmailState>('checking');
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('missing-token');
      return;
    }

    this.authService.verifyEmail(token).subscribe((result) => {
      if (result.success) {
        this.state.set('success');
        setTimeout(() => this.router.navigateByUrl('/dashboard'), 2000);
      } else {
        this.state.set('error');
        this.errorMessage.set(result.message ?? 'Ocurrió un error. Intenta de nuevo.');
      }
    });
  }
}
