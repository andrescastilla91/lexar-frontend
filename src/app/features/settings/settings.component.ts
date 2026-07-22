import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { CompanyService } from '../../core/services/company.service';
import { CompanyProfile } from '../../core/models/company.model';
import { ToastService } from '../../core/services/toast.service';
import { SettingsLegalFormComponent } from './components/settings-legal-form.component';
import { SettingsBillingFormComponent } from './components/settings-billing-form.component';
import { SettingsBrandFormComponent } from './components/settings-brand-form.component';
import { SettingsCatalogsComponent } from './components/settings-catalogs.component';
import { SettingsPlanComponent } from './components/settings-plan.component';

type SettingsTab = 'legal' | 'billing' | 'brand' | 'catalogs' | 'plan';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    SettingsLegalFormComponent,
    SettingsBillingFormComponent,
    SettingsBrandFormComponent,
    SettingsCatalogsComponent,
    SettingsPlanComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <div>
        <h1 class="text-2xl font-semibold text-text">Configuración de la empresa</h1>
        <p class="mt-1 text-sm text-subtle">Administra los datos legales, de facturación y de marca de tu empresa.</p>
      </div>

      <div class="border-b border-default">
        <nav class="hidden gap-6 sm:flex" aria-label="Secciones de configuración">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              (click)="activeTab.set(tab.id)"
              class="border-b-2 px-1 pb-3 text-sm font-medium transition"
              [class.border-navy-900]="activeTab() === tab.id"
              [class.text-text]="activeTab() === tab.id"
              [class.border-transparent]="activeTab() !== tab.id"
              [class.text-subtle]="activeTab() !== tab.id"
            >
              {{ tab.label }}
            </button>
          }
        </nav>
        <div class="pb-3 sm:hidden">
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
      </div>

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
        @case ('plan') {
          <app-settings-plan />
        }
      }
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
    { id: 'plan', label: 'Plan y facturación' },
  ];
  readonly activeTab = signal<SettingsTab>('legal');

  readonly company = signal<CompanyProfile | null>(null);

  readonly isSubmittingLegal = signal(false);
  readonly isSubmittingBilling = signal(false);
  readonly isSubmittingBrand = signal(false);
  readonly isUploadingLogo = signal(false);

  readonly legalError = signal<string | null>(null);
  readonly billingError = signal<string | null>(null);
  readonly brandError = signal<string | null>(null);

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
  }
}
