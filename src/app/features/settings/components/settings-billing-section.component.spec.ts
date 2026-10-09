import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { SettingsBillingSectionComponent } from './settings-billing-section.component';
import { SettingsCompanyDocumentsComponent } from './settings-company-documents.component';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { CompanyDocumentsService } from '../../../core/services/company-documents.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { BillingReadiness, CompanyProfile } from '../../../core/models/company.model';

describe('SettingsBillingSectionComponent (F45)', () => {
  let getBillingReadiness: jest.Mock;

  const missingState: BillingReadiness = {
    ready: false,
    missing: [
      { code: 'RUT_DOCUMENT', label: 'RUT cargado', section: 'billing' },
      { code: 'CITY', label: 'Ciudad', section: 'legal' },
    ],
  };

  function create(state: BillingReadiness | Error) {
    getBillingReadiness = jest
      .fn()
      .mockReturnValue(state instanceof Error ? throwError(() => state) : of(state));
    TestBed.configureTestingModule({
      providers: [
        { provide: SubscriptionService, useValue: { getBillingReadiness } },
        { provide: CompanyDocumentsService, useValue: { list: () => of([]) } },
        { provide: ConfirmDialogService, useValue: { confirm: jest.fn() } },
        { provide: ToastService, useValue: { success: jest.fn(), error: jest.fn() } },
      ],
    });
    const fb = TestBed.inject(FormBuilder);
    const fixture = TestBed.createComponent(SettingsBillingSectionComponent);
    fixture.componentRef.setInput(
      'form',
      fb.nonNullable.group({
        billingEmail: [''],
        billingContactName: [''],
        personType: [''],
        taxIdCheckDigit: [''],
        fiscalAddress: [''],
        fiscalResponsibilities: [[] as string[]],
      }),
    );
    fixture.componentRef.setInput('company', { taxId: '900123456' } as CompanyProfile);
    fixture.detectChanges();
    return fixture;
  }

  const query = (fixture: { nativeElement: HTMLElement }, selector: string) =>
    fixture.nativeElement.querySelector(selector);

  it('lista lo que falta para contratar y marca cuáles son de «Datos legales»', () => {
    const fixture = create(missingState);

    const box = query(fixture, '[data-test="readiness-missing"]') as HTMLElement;
    expect(box.textContent).toContain('RUT cargado');
    expect(box.textContent).toContain('Ciudad');
    expect(box.textContent).toContain('en «Datos legales»');
    expect(query(fixture, '[data-test="readiness-ready"]')).toBeNull();
  });

  it('el botón «Ir a Datos legales» pide cambiar de sección', () => {
    const fixture = create(missingState);
    const requested = jest.fn();
    fixture.componentInstance.sectionRequested.subscribe(requested);

    const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (item) => item.textContent?.includes('Ir a Datos legales'),
    );
    button!.click();

    expect(requested).toHaveBeenCalledWith('legal');
  });

  it('sin faltantes de «Datos legales» no ofrece el botón', () => {
    const fixture = create({
      ready: false,
      missing: [{ code: 'RUT_DOCUMENT', label: 'RUT cargado', section: 'billing' }],
    });

    expect(fixture.nativeElement.textContent).not.toContain('Ir a Datos legales');
  });

  it('cuando está todo completo lo dice', () => {
    const fixture = create({ ready: true, missing: [] });

    expect(query(fixture, '[data-test="readiness-ready"]')).not.toBeNull();
    expect(query(fixture, '[data-test="readiness-missing"]')).toBeNull();
  });

  it('si no puede consultar el estado (403) no muestra ningún aviso pero sí el formulario y los documentos', () => {
    const fixture = create(new Error('403'));

    expect(query(fixture, '[data-test="readiness-missing"]')).toBeNull();
    expect(query(fixture, '[data-test="readiness-ready"]')).toBeNull();
    expect(query(fixture, 'app-settings-billing-form')).not.toBeNull();
    expect(query(fixture, 'app-settings-company-documents')).not.toBeNull();
  });

  it('recalcula el estado cuando cambia la empresa guardada y cuando cambian los documentos', () => {
    const fixture = create(missingState);
    expect(getBillingReadiness).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('company', { taxId: '900123456', city: 'Bogotá' } as CompanyProfile);
    fixture.detectChanges();
    expect(getBillingReadiness).toHaveBeenCalledTimes(2);

    const documents = fixture.debugElement.query(By.directive(SettingsCompanyDocumentsComponent));
    (documents.componentInstance as SettingsCompanyDocumentsComponent).changed.emit();
    expect(getBillingReadiness).toHaveBeenCalledTimes(3);
  });
});
