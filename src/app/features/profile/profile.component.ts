import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { ProfileUser, SessionInfo } from '../../core/models/profile.model';
import { ProfileInfoFormComponent } from './components/profile-info-form.component';
import { ProfilePasswordFormComponent } from './components/profile-password-form.component';
import { ProfileSessionsListComponent } from './components/profile-sessions-list.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ProfileInfoFormComponent, ProfilePasswordFormComponent, ProfileSessionsListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
      <div>
        <h1 class="text-2xl font-semibold text-text">Mi perfil</h1>
        <p class="mt-1 text-sm text-subtle">Gestiona tus datos personales, contraseña y sesiones activas.</p>
      </div>

      <app-profile-info-form
        [form]="infoForm"
        [avatarUrl]="user()?.avatarUrl ?? null"
        [initials]="initials()"
        [isSubmitting]="isSubmittingProfile()"
        [isUploadingAvatar]="isUploadingAvatar()"
        [errorMessage]="profileError()"
        (submit)="onSubmitProfile()"
        (avatarSelected)="onAvatarSelected($event)"
      />

      <app-profile-password-form
        [form]="passwordForm"
        [isSubmitting]="isSubmittingPassword()"
        [errorMessage]="passwordError()"
        (submit)="onSubmitPassword()"
      />

      <app-profile-sessions-list
        [sessions]="sessions()"
        [isLoading]="isLoadingSessions()"
        (revoke)="onRevokeSession($event)"
      />
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly user = signal<ProfileUser | null>(null);
  readonly sessions = signal<SessionInfo[]>([]);
  readonly isLoadingSessions = signal(false);
  readonly isSubmittingProfile = signal(false);
  readonly isUploadingAvatar = signal(false);
  readonly isSubmittingPassword = signal(false);
  readonly profileError = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);

  readonly initials = signal('');

  readonly infoForm = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    phone: [''],
    themePreference: ['system' as 'light' | 'dark' | 'system'],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.profileService.getMe().subscribe({
      next: (user) => this.applyUser(user),
      error: () => this.profileError.set('No se pudo cargar tu perfil.'),
    });

    this.loadSessions();
  }

  onSubmitProfile(): void {
    if (this.isSubmittingProfile()) {
      return;
    }

    if (this.infoForm.invalid) {
      this.infoForm.markAllAsTouched();
      return;
    }

    this.isSubmittingProfile.set(true);
    this.profileError.set(null);

    this.profileService.updateMe(this.infoForm.getRawValue()).subscribe({
      next: (user) => {
        this.applyUser(user);
        this.themeService.setPreference(user.themePreference);
        this.isSubmittingProfile.set(false);
        this.toast.success('Perfil actualizado correctamente.');
      },
      error: (error) => {
        const message = error.error?.message || 'No se pudo actualizar tu perfil.';
        this.profileError.set(message);
        this.isSubmittingProfile.set(false);
        this.toast.error(message);
      },
    });
  }

  onAvatarSelected(file: File): void {
    if (this.isUploadingAvatar()) {
      return;
    }

    this.isUploadingAvatar.set(true);

    this.profileService.uploadAvatar(file).subscribe({
      next: (user) => {
        this.applyUser(user);
        this.isUploadingAvatar.set(false);
        this.toast.success('Foto de perfil actualizada correctamente.');
      },
      error: (error) => {
        const message = error.error?.message || 'No se pudo subir la foto de perfil.';
        this.profileError.set(message);
        this.isUploadingAvatar.set(false);
        this.toast.error(message);
      },
    });
  }

  onSubmitPassword(): void {
    if (this.isSubmittingPassword()) {
      return;
    }

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSubmittingPassword.set(true);
    this.passwordError.set(null);

    this.profileService.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.toast.success('Contraseña actualizada. Vuelve a iniciar sesión.');
        this.authService.logout().subscribe(() => {
          this.router.navigateByUrl('/login');
        });
      },
      error: (error) => {
        const message = error.error?.message || 'La contraseña actual es incorrecta.';
        this.passwordError.set(message);
        this.isSubmittingPassword.set(false);
        this.toast.error(message);
      },
    });
  }

  onRevokeSession(sessionId: string): void {
    this.confirmDialog
      .confirm({
        title: 'Cerrar sesión',
        message: '¿Quieres cerrar esta sesión? El dispositivo perderá acceso.',
        confirmLabel: 'Cerrar sesión',
        danger: true,
      })
      .then((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.profileService.revokeSession(sessionId).subscribe({
          next: () => {
            this.loadSessions();
            this.toast.success('Sesión cerrada correctamente.');
          },
          error: (error) => {
            this.toast.error(error.error?.message || 'No se pudo cerrar la sesión.');
          },
        });
      });
  }

  private loadSessions(): void {
    this.isLoadingSessions.set(true);
    this.profileService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.isLoadingSessions.set(false);
      },
      error: () => {
        this.isLoadingSessions.set(false);
      },
    });
  }

  private applyUser(user: ProfileUser): void {
    this.user.set(user);
    this.initials.set(this.computeInitials(user));
    this.infoForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      themePreference: user.themePreference,
    });
    this.authService.patchCurrentUser({
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    });
  }

  private computeInitials(user: ProfileUser): string {
    const first = user.firstName?.[0] ?? '';
    const last = user.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || 'LS';
  }
}
