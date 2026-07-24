import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CompanyService } from '../../core/services/company.service';
import { UsersService } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { CompanyProfile } from '../../core/models/company.model';
import { SettingsLegalFormComponent } from '../settings/components/settings-legal-form.component';
import { UserFormComponent } from '../users/components/user-form.component';

type WizardStep = 1 | 2 | 3;

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SettingsLegalFormComponent, UserFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-3xl">
      <div class="mb-8">
        <p class="text-sm font-medium text-subtle">Primeros pasos</p>
        <h1 class="mt-1 text-2xl font-semibold text-text">Configura tu cuenta de LexAr</h1>
        <p class="mt-2 text-sm text-subtle">
          Estos pasos son opcionales y puedes retomarlos después desde el checklist del dashboard.
        </p>

        <div class="mt-6 flex items-center gap-2">
          @for (step of [1, 2, 3]; track step) {
            <div
              class="h-1.5 flex-1 rounded-full"
              [class.bg-navy-900]="step <= currentStep()"
              [class.bg-surface-muted]="step > currentStep()"
            ></div>
          }
        </div>
      </div>

      @if (currentStep() === 1) {
        <div>
          <app-settings-legal-form
            [form]="legalForm"
            [taxId]="company()?.taxId ?? ''"
            [isSubmitting]="isSubmittingLegal()"
            [errorMessage]="legalError()"
            (submit)="onSubmitLegal()"
          />
          <div class="mt-4 flex justify-end">
            <button type="button" class="text-sm font-medium text-subtle hover:underline" (click)="skipLegal()">
              Saltar por ahora
            </button>
          </div>
        </div>
      }

      @if (currentStep() === 2) {
        <div>
          <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
            <h2 class="text-lg font-semibold text-text">Invita a tu equipo</h2>
            <p class="mt-1 text-sm text-subtle">Agrega a un colega para que empiece a trabajar contigo. Puedes hacerlo más tarde desde Usuarios.</p>
            <button
              type="button"
              class="mt-4 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950"
              (click)="showInviteForm.set(true)"
            >
              Invitar usuario
            </button>
          </div>

          <app-user-form
            [form]="inviteForm"
            [isOpen]="showInviteForm()"
            [isSubmitting]="isSubmittingInvite()"
            [errorMessage]="inviteError()"
            (formCancel)="showInviteForm.set(false)"
            (formSubmit)="onSubmitInvite()"
          />

          <div class="mt-4 flex justify-between">
            <button type="button" class="text-sm font-medium text-subtle hover:underline" (click)="goToStep(1)">
              Atrás
            </button>
            <button type="button" class="text-sm font-medium text-subtle hover:underline" (click)="skipInvite()">
              Saltar por ahora
            </button>
          </div>
        </div>
      }

      @if (currentStep() === 3) {
        <div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
              <h2 class="text-base font-semibold text-text">Crea tu primer cliente</h2>
              <p class="mt-1 text-sm text-subtle">Registra la primera persona o empresa que representas.</p>
              <a
                routerLink="/clientes"
                class="mt-4 inline-block rounded-md border border-default px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface-muted"
              >
                Ir a Clientes
              </a>
            </div>
            <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
              <h2 class="text-base font-semibold text-text">Crea tu primer proceso</h2>
              <p class="mt-1 text-sm text-subtle">Abre el primer expediente que quieras gestionar en LexAr.</p>
              <a
                routerLink="/procesos"
                class="mt-4 inline-block rounded-md border border-default px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface-muted"
              >
                Ir a Procesos
              </a>
            </div>
          </div>

          <div class="mt-6 flex justify-between">
            <button type="button" class="text-sm font-medium text-subtle hover:underline" (click)="goToStep(2)">
              Atrás
            </button>
            <button
              type="button"
              class="rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
              [disabled]="isFinishing()"
              (click)="finish()"
            >
              Terminar
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class OnboardingComponent {
  private readonly fb = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly usersService = inject(UsersService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly router = inject(Router);

  readonly currentStep = signal<WizardStep>(1);
  readonly company = signal<CompanyProfile | null>(null);

  readonly isSubmittingLegal = signal(false);
  readonly legalError = signal<string | null>(null);

  readonly showInviteForm = signal(false);
  readonly isSubmittingInvite = signal(false);
  readonly inviteError = signal<string | null>(null);

  readonly isFinishing = signal(false);

  // El onboarding es de un solo uso: si se saltan pasos, no hay otra
  // oportunidad de retomarlos desde aquí una vez completado — se avisa al
  // usuario dónde tendrá que llenarlos a mano.
  private readonly skippedLegal = signal(false);
  private readonly skippedInvite = signal(false);

  readonly legalForm = this.fb.nonNullable.group({
    legalName: [''],
    address: [''],
    legalRepresentative: [''],
    city: [''],
    country: [''],
    phone: [''],
    email: [''],
    registrationNumber: [''],
    taxRegime: [''],
  });

  readonly inviteForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.companyService.getCompany().subscribe({
      next: (company) => {
        if (company.onboardingCompletedAt) {
          // El onboarding ya se completó una vez — no hay vuelta atrás desde
          // esta ruta, el resto se gestiona a mano desde Configuración/Usuarios.
          this.router.navigate(['/dashboard']);
          return;
        }

        this.company.set(company);
        this.legalForm.patchValue({
          legalName: company.legalName,
          address: company.address ?? '',
          legalRepresentative: company.legalRepresentative ?? '',
          city: company.city ?? '',
          country: company.country ?? '',
          phone: company.phone ?? '',
          email: company.email ?? '',
          registrationNumber: company.registrationNumber ?? '',
          taxRegime: company.taxRegime ?? '',
        });
      },
      error: () => {},
    });
  }

  goToStep(step: WizardStep): void {
    this.currentStep.set(step);
  }

  async skipLegal(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Saltar datos legales',
      message:
        'Este paso no se volverá a mostrar. Podrás completar los datos legales de tu empresa cuando quieras desde Configuración > Datos legales.',
      confirmLabel: 'Saltar por ahora',
    });
    if (!confirmed) {
      return;
    }

    this.skippedLegal.set(true);
    this.goToStep(2);
  }

  async skipInvite(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Saltar invitación de equipo',
      message:
        'Este paso no se volverá a mostrar. Podrás invitar a tu equipo cuando quieras desde Usuarios > Invitar usuario.',
      confirmLabel: 'Saltar por ahora',
    });
    if (!confirmed) {
      return;
    }

    this.skippedInvite.set(true);
    this.goToStep(3);
  }

  onSubmitLegal(): void {
    if (this.isSubmittingLegal()) {
      return;
    }

    this.isSubmittingLegal.set(true);
    this.legalError.set(null);

    this.companyService.updateCompany(this.legalForm.getRawValue()).subscribe({
      next: (company) => {
        this.company.set(company);
        this.isSubmittingLegal.set(false);
        this.toast.success('Datos de tu empresa guardados.');
        this.goToStep(2);
      },
      error: (error) => {
        const message = error.error?.message || 'No se pudieron guardar los datos.';
        this.legalError.set(message);
        this.isSubmittingLegal.set(false);
        this.toast.error(message);
      },
    });
  }

  onSubmitInvite(): void {
    if (this.isSubmittingInvite()) {
      return;
    }

    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    this.isSubmittingInvite.set(true);
    this.inviteError.set(null);

    this.usersService.createUser(this.inviteForm.getRawValue()).subscribe({
      next: (response) => {
        this.isSubmittingInvite.set(false);
        this.showInviteForm.set(false);
        this.toast.success(response.message || 'Invitación enviada.');
        this.goToStep(3);
      },
      error: (error) => {
        const message = error.error?.message || 'No se pudo enviar la invitación.';
        this.inviteError.set(message);
        this.isSubmittingInvite.set(false);
        this.toast.error(message);
      },
    });
  }

  async finish(): Promise<void> {
    if (this.isFinishing()) {
      return;
    }

    if (this.skippedLegal() || this.skippedInvite()) {
      const pending: string[] = [];
      if (this.skippedLegal()) {
        pending.push('los datos legales de tu empresa (Configuración > Datos legales)');
      }
      if (this.skippedInvite()) {
        pending.push('la invitación de tu equipo (Usuarios > Invitar usuario)');
      }

      const confirmed = await this.confirmDialog.confirm({
        title: 'Terminar configuración inicial',
        message: `Este asistente no se volverá a mostrar. Quedó pendiente: ${pending.join(' y ')}. Podrás completarlo cuando quieras desde esas mismas secciones. ¿Confirmas terminar?`,
        confirmLabel: 'Terminar de todas formas',
      });
      if (!confirmed) {
        return;
      }
    }

    this.isFinishing.set(true);
    this.companyService.completeOnboarding().subscribe({
      next: () => {
        this.isFinishing.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isFinishing.set(false);
        this.toast.error(error.error?.message || 'No se pudo completar la configuración inicial.');
      },
    });
  }
}
