import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { CompanyService } from '../../core/services/company.service';
import { CompanyProfile } from '../../core/models/company.model';
import { ToastService } from '../../core/services/toast.service';
import { SettingsLegalFormComponent } from './components/settings-legal-form.component';
import { SettingsBillingFormComponent } from './components/settings-billing-form.component';
import { SettingsBrandFormComponent } from './components/settings-brand-form.component';
import { SettingsCatalogsComponent } from './components/settings-catalogs.component';
import { SettingsTaskTemplatesComponent } from './components/settings-task-templates.component';
import { SettingsTaskStatusesComponent } from './components/settings-task-statuses.component';
import { SettingsPlanComponent } from './components/settings-plan.component';
import { SettingsSecurityFormComponent } from './components/settings-security-form.component';
import { SettingsNotificationsComponent } from './components/settings-notifications.component';

type SettingsTab =
  | 'legal'
  | 'billing'
  | 'brand'
  | 'catalogs'
  | 'task-templates'
  | 'task-statuses'
  | 'plan'
  | 'security'
  | 'notifications';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    SettingsLegalFormComponent,
    SettingsBillingFormComponent,
    SettingsBrandFormComponent,
    SettingsCatalogsComponent,
    SettingsTaskTemplatesComponent,
    SettingsTaskStatusesComponent,
    SettingsPlanComponent,
    SettingsSecurityFormComponent,
    SettingsNotificationsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:max-w-5xl lg:px-8">
      <div>
        <h1 class="text-2xl font-semibold text-text">Configuración de la empresa</h1>
        <p class="mt-1 text-sm text-subtle">Administra los datos legales, de facturación y de marca de tu empresa.</p>
      </div>

      <!-- Mitigación temporal (2026-08-08, versión 3) mientras diseño define
           el rediseño definitivo. El corte mobile/desktop se mueve de 640px
           (sm) a 1024px (lg): por debajo de 1024px (celular Y tablet) sigue
           el select desplegable de siempre, sin ningún cambio de
           comportamiento en ese rango. Desde 1024px (desktop grande) se
           muestra un sidebar real a la izquierda en vez de una fila o lista
           apilada arriba. Se eligió 1024px y no 640px a propósito: los
           formularios internos (ej. datos legales) usan sus propios
           sm:grid-cols-2/3 que se activan por ancho de VIEWPORT, no por el
           espacio que les quede — si el sidebar apareciera ya en 640px,
           esos formularios perderían ancho real sin que sus columnas
           internas se enteren y se verían apretados. Por eso también el
           contenedor pasa a max-w-5xl solo en lg: (antes max-w-3xl), para
           que el contenido conserve un ancho similar al que tenía antes de
           que el sidebar le quitara esos ~250px. -->
      <div class="lg:hidden">
        <select
          class="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
          [value]="activeTab()"
          (change)="onTabSelect($event)"
        >
          @for (tab of tabs; track tab.id) {
            <option [value]="tab.id">{{ tab.label }}</option>
          }
        </select>
      </div>

      <div class="flex flex-col gap-6 lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-8">
        <nav class="hidden lg:flex lg:flex-col lg:gap-1" aria-label="Secciones de configuración">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              (click)="activeTab.set(tab.id)"
              class="rounded-md px-3 py-2 text-left text-sm font-medium transition"
              [class.bg-navy-900]="activeTab() === tab.id"
              [class.text-white]="activeTab() === tab.id"
              [class.text-subtle]="activeTab() !== tab.id"
              [class.hover:bg-surface-muted]="activeTab() !== tab.id"
            >
              {{ tab.label }}
            </button>
          }
        </nav>

        <div class="min-w-0">
          @switch (activeTab()) {
            @case ('legal') {
              <app-settings-legal-form
                [form]="legalForm"
                [taxId]="company()?.taxId ?? ''"
                [isSubmitting]="isSubmittingLegal()"
                [errorMessage]="legalError()"
                (submit)="onSubmitLegal()"
              />
            }
            @case ('billing') {
              <app-settings-billing-form
                [form]="billingForm"
                [isSubmitting]="isSubmittingBilling()"
                [errorMessage]="billingError()"
                (submit)="onSubmitBilling()"
              />
            }
            @case ('brand') {
              <app-settings-brand-form
                [form]="brandForm"
                [logoUrl]="company()?.logoUrl ?? null"
                [isSubmitting]="isSubmittingBrand()"
                [isUploadingLogo]="isUploadingLogo()"
                [errorMessage]="brandError()"
                (submit)="onSubmitBrand()"
                (logoSelected)="onLogoSelected($event)"
              />
            }
            @case ('catalogs') {
              <app-settings-catalogs />
            }
            @case ('task-templates') {
              <app-settings-task-templates />
            }
            @case ('task-statuses') {
              <app-settings-task-statuses />
            }
            @case ('plan') {
              <app-settings-plan />
            }
            @case ('security') {
              <app-settings-security-form
                [form]="securityForm"
                [isSubmitting]="isSubmittingSecurity()"
                [errorMessage]="securityError()"
                (submit)="onSubmitSecurity()"
              />
            }
            @case ('notifications') {
              <app-settings-notifications />
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly toast = inject(ToastService);

  readonly tabs: { id: SettingsTab; label: string }[] = [
    { id: 'legal', label: 'Datos legales' },
    { id: 'billing', label: 'Facturación' },
    { id: 'brand', label: 'Marca' },
    { id: 'catalogs', label: 'Catálogos' },
    { id: 'task-templates', label: 'Plantillas de tareas' },
    { id: 'task-statuses', label: 'Estados de tareas' },
    { id: 'plan', label: 'Plan y facturación' },
    { id: 'security', label: 'Seguridad' },
    { id: 'notifications', label: 'Notificaciones' },
  ];
  readonly activeTab = signal<SettingsTab>('legal');

  readonly company = signal<CompanyProfile | null>(null);

  readonly isSubmittingLegal = signal(false);
  readonly isSubmittingBilling = signal(false);
  readonly isSubmittingBrand = signal(false);
  readonly isUploadingLogo = signal(false);
  readonly isSubmittingSecurity = signal(false);

  readonly legalError = signal<string | null>(null);
  readonly billingError = signal<string | null>(null);
  readonly brandError = signal<string | null>(null);
  readonly securityError = signal<string | null>(null);

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

  readonly billingForm = this.fb.nonNullable.group({
    billingEmail: [''],
  });

  readonly brandForm = this.fb.nonNullable.group({
    website: [''],
  });

  readonly securityForm = this.fb.nonNullable.group({
    require2fa: [false],
  });

  ngOnInit(): void {
    this.companyService.getCompany().subscribe({
      next: (company) => this.applyCompany(company),
      error: () => this.legalError.set('No se pudo cargar la configuración de la empresa.'),
    });
  }

  onTabSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as SettingsTab;
    this.activeTab.set(value);
  }

  onSubmitLegal(): void {
    if (this.isSubmittingLegal()) {
      return;
    }

    this.isSubmittingLegal.set(true);
    this.legalError.set(null);

    this.companyService.updateCompany(this.legalForm.getRawValue()).subscribe({
      next: (company) => {
        this.applyCompany(company);
        this.isSubmittingLegal.set(false);
        this.toast.success('Datos legales guardados correctamente.');
      },
      error: (error) => {
        const message = error.error?.message || 'No se pudieron guardar los datos legales.';
        this.legalError.set(message);
        this.isSubmittingLegal.set(false);
        this.toast.error(message);
      },
    });
  }

  onSubmitBilling(): void {
    if (this.isSubmittingBilling()) {
      return;
    }

    this.isSubmittingBilling.set(true);
    this.billingError.set(null);

    this.companyService.updateCompany(this.billingForm.getRawValue()).subscribe({
      next: (company) => {
        this.applyCompany(company);
        this.isSubmittingBilling.set(false);
        this.toast.success('Datos de facturación guardados correctamente.');
      },
      error: (error) => {
        const message = error.error?.message || 'No se pudo guardar el correo de facturación.';
        this.billingError.set(message);
        this.isSubmittingBilling.set(false);
        this.toast.error(message);
      },
    });
  }

  onSubmitBrand(): void {
    if (this.isSubmittingBrand()) {
      return;
    }

    this.isSubmittingBrand.set(true);
    this.brandError.set(null);

    this.companyService.updateCompany(this.brandForm.getRawValue()).subscribe({
      next: (company) => {
        this.applyCompany(company);
        this.isSubmittingBrand.set(false);
        this.toast.success('Datos de marca guardados correctamente.');
      },
      error: (error) => {
        const message = error.error?.message || 'No se pudo guardar el sitio web.';
        this.brandError.set(message);
        this.isSubmittingBrand.set(false);
        this.toast.error(message);
      },
    });
  }

  onSubmitSecurity(): void {
    if (this.isSubmittingSecurity()) {
      return;
    }

    this.isSubmittingSecurity.set(true);
    this.securityError.set(null);

    this.companyService.updateCompany(this.securityForm.getRawValue()).subscribe({
      next: (company) => {
        this.applyCompany(company);
        this.isSubmittingSecurity.set(false);
        this.toast.success('Política de seguridad guardada correctamente.');
      },
      error: (error) => {
        const message = error.error?.message || 'No se pudo guardar la política de seguridad.';
        this.securityError.set(message);
        this.isSubmittingSecurity.set(false);
        this.toast.error(message);
      },
    });
  }

  onLogoSelected(file: File): void {
    if (this.isUploadingLogo()) {
      return;
    }

    this.isUploadingLogo.set(true);

    this.companyService.uploadLogo(file).subscribe({
      next: (company) => {
        this.applyCompany(company);
        this.isUploadingLogo.set(false);
        this.toast.success('Logo actualizado correctamente.');
      },
      error: (error) => {
        const message = error.error?.message || 'No se pudo subir el logo.';
        this.brandError.set(message);
        this.isUploadingLogo.set(false);
        this.toast.error(message);
      },
    });
  }

  private applyCompany(company: CompanyProfile): void {
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
    this.billingForm.patchValue({
      billingEmail: company.billingEmail ?? '',
    });
    this.brandForm.patchValue({
      website: company.website ?? '',
    });
    this.securityForm.patchValue({
      require2fa: company.require2fa,
    });
  }
}
