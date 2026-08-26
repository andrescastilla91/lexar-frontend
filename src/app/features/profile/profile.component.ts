import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationsService, PushState } from '../../core/services/notifications.service';
import { ProfileUser, SessionInfo } from '../../core/models/profile.model';
import { NotificationPreferenceItem } from '../../core/models/notification.model';
import { ProfileInfoFormComponent } from './components/profile-info-form.component';
import { ProfilePasswordFormComponent } from './components/profile-password-form.component';
import { ProfileSessionsListComponent } from './components/profile-sessions-list.component';
import { ProfileSecurityCardComponent } from './components/profile-security-card.component';
import { ProfileNotificationsCardComponent } from './components/profile-notifications-card.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ProfileInfoFormComponent,
    ProfilePasswordFormComponent,
    ProfileSessionsListComponent,
    ProfileSecurityCardComponent,
    ProfileNotificationsCardComponent,
  ],
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

      <app-profile-security-card
        [twoFactorEnabled]="twoFactorEnabled()"
        [isSettingUp]="isSettingUpTwoFactor()"
        [isStarting]="isStartingTwoFactor()"
        [otpauthUri]="otpauthUri()"
        [secret]="twoFactorSecret()"
        [isVerifying]="isVerifyingTwoFactor()"
        [verifyError]="twoFactorVerifyError()"
        [recoveryCodes]="recoveryCodes()"
        [disableForm]="disableTwoFactorForm"
        [isDisabling]="isDisablingTwoFactor()"
        [disableError]="disableTwoFactorError()"
        [isRegeneratingCodes]="isRegeneratingRecoveryCodes()"
        [regenerateCodesError]="regenerateCodesError()"
        (startSetup)="onStartTwoFactorSetup()"
        (cancelSetup)="onCancelTwoFactorSetup()"
        (confirmSetup)="onConfirmTwoFactorSetup($event)"
        (dismissRecoveryCodes)="onDismissRecoveryCodes()"
        (disable)="onDisableTwoFactor()"
        (regenerateRecoveryCodes)="onRegenerateRecoveryCodes()"
      />

      <app-profile-sessions-list
        [sessions]="sessions()"
        [isLoading]="isLoadingSessions()"
        (revoke)="onRevokeSession($event)"
      />

      <app-profile-notifications-card
        [preferences]="notificationPreferences()"
        [isSaving]="isSavingPreferences()"
        [pushState]="pushState()"
        [isTogglingPush]="isTogglingPush()"
        (preferencesChange)="notificationPreferences.set($event)"
        (save)="onSaveNotificationPreferences()"
        (enablePush)="onEnablePush()"
        (disablePush)="onDisablePush()"
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
  private readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);

  readonly notificationPreferences = signal<NotificationPreferenceItem[]>([]);
  readonly isSavingPreferences = signal(false);
  readonly pushState = signal<PushState>('unsupported');
  readonly isTogglingPush = signal(false);

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

  // F11 (S10): verificación en dos pasos
  readonly twoFactorEnabled = computed(() => this.authService.currentUser()?.twoFactorEnabled ?? false);
  readonly isSettingUpTwoFactor = signal(false);
  readonly isStartingTwoFactor = signal(false);
  readonly otpauthUri = signal<string | null>(null);
  readonly twoFactorSecret = signal<string | null>(null);
  readonly isVerifyingTwoFactor = signal(false);
  readonly twoFactorVerifyError = signal<string | null>(null);
  readonly recoveryCodes = signal<string[] | null>(null);
  readonly isDisablingTwoFactor = signal(false);
  readonly disableTwoFactorError = signal<string | null>(null);
  readonly isRegeneratingRecoveryCodes = signal(false);
  readonly regenerateCodesError = signal<string | null>(null);

  readonly disableTwoFactorForm = this.fb.nonNullable.group({
    password: ['', Validators.required],
    code: ['', Validators.required],
  });

  ngOnInit(): void {
    this.profileService.getMe().subscribe({
      next: (user) => this.applyUser(user),
      error: () => this.profileError.set('No se pudo cargar tu perfil.'),
    });

    this.loadSessions();

    this.notificationsService.getPreferences().subscribe({
      next: (preferences) => this.notificationPreferences.set(preferences),
      error: () => {},
    });

    this.notificationsService.getPushState().then((state) => this.pushState.set(state));
  }

  onEnablePush(): void {
    if (this.isTogglingPush()) {
      return;
    }

    this.isTogglingPush.set(true);
    this.notificationsService
      .enablePush()
      .then(() => {
        this.pushState.set('subscribed');
        this.isTogglingPush.set(false);
        this.toast.success('Notificaciones push activadas en este dispositivo.');
      })
      .catch((error: Error) => {
        this.isTogglingPush.set(false);
        this.toast.error(error.message || 'No se pudo activar el push.');
      });
  }

  onDisablePush(): void {
    if (this.isTogglingPush()) {
      return;
    }

    this.isTogglingPush.set(true);
    this.notificationsService
      .disablePush()
      .then(() => {
        this.pushState.set('not-subscribed');
        this.isTogglingPush.set(false);
        this.toast.success('Notificaciones push desactivadas en este dispositivo.');
      })
      .catch((error: Error) => {
        this.isTogglingPush.set(false);
        this.toast.error(error.message || 'No se pudo desactivar el push.');
      });
  }

  onSaveNotificationPreferences(): void {
    if (this.isSavingPreferences()) {
      return;
    }

    this.isSavingPreferences.set(true);
    this.notificationsService.updatePreferences(this.notificationPreferences()).subscribe({
      next: () => {
        this.isSavingPreferences.set(false);
        this.toast.success('Preferencias de notificación actualizadas.');
      },
      error: (error) => {
        this.isSavingPreferences.set(false);
        this.toast.error(error.error?.message || 'No se pudieron guardar las preferencias.');
      },
    });
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

  onStartTwoFactorSetup(): void {
    if (this.isStartingTwoFactor()) {
      return;
    }

    this.isStartingTwoFactor.set(true);
    this.authService.setupTwoFactor().subscribe({
      next: (res) => {
        this.otpauthUri.set(res.otpauthUri);
        this.twoFactorSecret.set(res.secret);
        this.isSettingUpTwoFactor.set(true);
        this.isStartingTwoFactor.set(false);
      },
      error: (error) => {
        this.isStartingTwoFactor.set(false);
        this.toast.error(error.error?.message || 'No se pudo iniciar la activación.');
      },
    });
  }

  onCancelTwoFactorSetup(): void {
    this.isSettingUpTwoFactor.set(false);
    this.otpauthUri.set(null);
    this.twoFactorSecret.set(null);
    this.twoFactorVerifyError.set(null);
  }

  onConfirmTwoFactorSetup(code: string): void {
    if (this.isVerifyingTwoFactor() || !code?.trim()) {
      return;
    }

    this.isVerifyingTwoFactor.set(true);
    this.twoFactorVerifyError.set(null);

    this.authService.verifyTwoFactor(code.trim()).subscribe({
      next: (res) => {
        this.recoveryCodes.set(res.recoveryCodes);
        this.isSettingUpTwoFactor.set(false);
        this.isVerifyingTwoFactor.set(false);
        this.otpauthUri.set(null);
        this.twoFactorSecret.set(null);
        this.toast.success('Verificación en dos pasos activada correctamente.');
      },
      error: (error) => {
        this.twoFactorVerifyError.set(error.error?.message || 'El código ingresado no es válido.');
        this.isVerifyingTwoFactor.set(false);
      },
    });
  }

  onDismissRecoveryCodes(): void {
    this.recoveryCodes.set(null);
  }

  onDisableTwoFactor(): void {
    if (this.isDisablingTwoFactor()) {
      return;
    }

    if (this.disableTwoFactorForm.invalid) {
      this.disableTwoFactorForm.markAllAsTouched();
      return;
    }

    this.isDisablingTwoFactor.set(true);
    this.disableTwoFactorError.set(null);

    const { password, code } = this.disableTwoFactorForm.getRawValue();
    this.authService.disableTwoFactor(password, code).subscribe({
      next: () => {
        this.isDisablingTwoFactor.set(false);
        this.disableTwoFactorForm.reset();
        this.toast.success('Verificación en dos pasos desactivada correctamente.');
      },
      error: (error) => {
        this.disableTwoFactorError.set(error.error?.message || 'No se pudo desactivar la verificación en dos pasos.');
        this.isDisablingTwoFactor.set(false);
      },
    });
  }

  onRegenerateRecoveryCodes(): void {
    if (this.isRegeneratingRecoveryCodes()) {
      return;
    }

    if (this.disableTwoFactorForm.invalid) {
      this.disableTwoFactorForm.markAllAsTouched();
      return;
    }

    this.isRegeneratingRecoveryCodes.set(true);
    this.regenerateCodesError.set(null);

    const { password, code } = this.disableTwoFactorForm.getRawValue();
    this.authService.regenerateTwoFactorRecoveryCodes(password, code).subscribe({
      next: (res) => {
        this.recoveryCodes.set(res.recoveryCodes);
        this.isRegeneratingRecoveryCodes.set(false);
        this.disableTwoFactorForm.reset();
        this.toast.success('Códigos de recuperación regenerados correctamente.');
      },
      error: (error) => {
        this.regenerateCodesError.set(error.error?.message || 'No se pudieron regenerar los códigos de recuperación.');
        this.isRegeneratingRecoveryCodes.set(false);
      },
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
