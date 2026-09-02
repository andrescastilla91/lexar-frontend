import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SettingsComponent } from './settings.component';
import { CompanyService } from '../../core/services/company.service';
import { CompanyProfile } from '../../core/models/company.model';
import { ToastService } from '../../core/services/toast.service';
import { PlanUpgradeService } from '../../core/services/plan-upgrade.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { Entitlements } from '../../core/models/subscription-backend.model';

describe('SettingsComponent', () => {
  let companyServiceMock: {
    getCompany: jest.Mock;
    updateCompany: jest.Mock;
    uploadLogo: jest.Mock;
  };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };
  let planUpgradeMock: { isPlanGateError: jest.Mock; promptUpgrade: jest.Mock };
  // F7-R3: al abrir ?tab=plan se renderiza el SettingsPlanComponent real
  // (no un mock), así que su dependencia SubscriptionService también hay
  // que proveerla aquí o revienta con NG0201 (No provider for HttpClient).
  let subscriptionServiceMock: {
    getEntitlements: jest.Mock;
    getPlanCatalog: jest.Mock;
    listInvoices: jest.Mock;
    isSimulationEnabled: jest.Mock;
  };
  let queryParams: Record<string, string>;

  const baseEntitlements: Entitlements = {
    planCode: 'TRIAL',
    planName: 'Prueba gratuita',
    status: 'trialing',
    isReadOnly: false,
    trialEndsAt: null,
    currentPeriodEnd: new Date().toISOString(),
    cancelAtPeriodEnd: false,
    features: {
      chatbot: true,
      clientPortal: true,
      advancedReports: false,
      taskApprovals: true,
      customCatalogs: true,
      mandatory2faPolicy: true,
      exportableReports: true,
      exportableAudit: false,
      earlyAccess: false,
    },
    limits: { maxUsers: 10, maxActiveProcesses: 100, maxStorageMb: 10240, aiCreditsMonth: 50, portalClientsMax: null },
    usage: { users: 1, activeProcesses: 1, storageMb: 1 },
  };

  const baseCompany: CompanyProfile = {
    id: 'c1',
    legalName: 'Bufete Test',
    taxId: 'TAXID-1',
    address: null,
    email: null,
    legalRepresentative: null,
    phone: null,
    city: null,
    country: 'CO',
    registrationNumber: null,
    taxRegime: null,
    billingEmail: null,
    website: null,
    logoUrl: null,
    require2fa: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  function configure(initialQueryParams: Record<string, string> = {}): void {
    companyServiceMock = {
      getCompany: jest.fn().mockReturnValue(of(baseCompany)),
      updateCompany: jest.fn(),
      uploadLogo: jest.fn(),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };
    planUpgradeMock = { isPlanGateError: jest.fn().mockReturnValue(false), promptUpgrade: jest.fn() };
    subscriptionServiceMock = {
      getEntitlements: jest.fn().mockReturnValue(of(baseEntitlements)),
      getPlanCatalog: jest.fn().mockReturnValue(of([])),
      listInvoices: jest.fn().mockReturnValue(of([])),
      isSimulationEnabled: jest.fn().mockReturnValue(of(false)),
    };
    queryParams = initialQueryParams;

    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: CompanyService, useValue: companyServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: PlanUpgradeService, useValue: planUpgradeMock },
        { provide: SubscriptionService, useValue: subscriptionServiceMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga la empresa y llena los formularios', () => {
    const component = createComponent();

    expect(companyServiceMock.getCompany).toHaveBeenCalled();
    expect(component.company()).toEqual(baseCompany);
    expect(component.legalForm.get('legalName')?.value).toBe('Bufete Test');
    expect(component.billingForm.get('billingEmail')?.value).toBe('');
  });

  it('si falla la carga de la empresa, muestra un mensaje de error', () => {
    companyServiceMock.getCompany.mockReturnValue(throwError(() => new Error('fail')));
    const component = createComponent();

    expect(component.legalError()).toBe('No se pudo cargar la configuración de la empresa.');
  });

  it('onSubmitLegal no hace nada si ya está enviando', () => {
    const component = createComponent();
    component.isSubmittingLegal.set(true);

    component.onSubmitLegal();

    expect(companyServiceMock.updateCompany).not.toHaveBeenCalled();
  });

  it('onSubmitLegal actualiza la empresa en éxito', () => {
    const updated: CompanyProfile = { ...baseCompany, city: 'Bogotá' };
    companyServiceMock.updateCompany.mockReturnValue(of(updated));
    const component = createComponent();

    component.onSubmitLegal();

    expect(companyServiceMock.updateCompany).toHaveBeenCalled();
    expect(component.company()).toEqual(updated);
    expect(component.isSubmittingLegal()).toBe(false);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Datos legales guardados correctamente.');
  });

  it('onSubmitLegal en error muestra el mensaje del backend y un toast', () => {
    // BUG-20: el mock simula la forma real que arma error.interceptor.ts
    // ({message, statusCode, error}) — el componente lee error.message, no
    // error.error?.message.
    companyServiceMock.updateCompany.mockReturnValue(
      throwError(() => ({ message: 'Dato inválido' })),
    );
    const component = createComponent();

    component.onSubmitLegal();

    expect(component.legalError()).toBe('Dato inválido');
    expect(component.isSubmittingLegal()).toBe(false);
    expect(toastServiceMock.error).toHaveBeenCalledWith('Dato inválido');
  });

  it('onSubmitBilling actualiza el correo de facturación', () => {
    const updated: CompanyProfile = { ...baseCompany, billingEmail: 'facturas@bufete.com' };
    companyServiceMock.updateCompany.mockReturnValue(of(updated));
    const component = createComponent();

    component.onSubmitBilling();

    expect(companyServiceMock.updateCompany).toHaveBeenCalled();
    expect(component.company()?.billingEmail).toBe('facturas@bufete.com');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Datos de facturación guardados correctamente.');
  });

  it('onSubmitBrand actualiza el sitio web', () => {
    const updated: CompanyProfile = { ...baseCompany, website: 'https://bufete.com' };
    companyServiceMock.updateCompany.mockReturnValue(of(updated));
    const component = createComponent();

    component.onSubmitBrand();

    expect(companyServiceMock.updateCompany).toHaveBeenCalled();
    expect(component.company()?.website).toBe('https://bufete.com');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Datos de marca guardados correctamente.');
  });

  it('onLogoSelected sube el logo y actualiza la empresa', () => {
    const updated: CompanyProfile = { ...baseCompany, logoUrl: 'https://cdn/logo.png' };
    companyServiceMock.uploadLogo.mockReturnValue(of(updated));
    const component = createComponent();
    const file = new File(['x'], 'logo.png', { type: 'image/png' });

    component.onLogoSelected(file);

    expect(companyServiceMock.uploadLogo).toHaveBeenCalledWith(file);
    expect(component.company()?.logoUrl).toBe('https://cdn/logo.png');
    expect(component.isUploadingLogo()).toBe(false);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Logo actualizado correctamente.');
  });

  it('onLogoSelected no hace nada si ya está subiendo', () => {
    const component = createComponent();
    component.isUploadingLogo.set(true);

    component.onLogoSelected(new File(['x'], 'a.png'));

    expect(companyServiceMock.uploadLogo).not.toHaveBeenCalled();
  });

  // Mitigación temporal (2026-08-08, versión 3): el corte mobile/desktop se
  // movió de 640px (sm) a 1024px (lg) — por debajo de 1024px sigue el
  // select de siempre (celular Y tablet, sin cambios de comportamiento en
  // ese rango); desde 1024px se muestra un sidebar real a la izquierda en
  // vez de una lista apilada arriba del contenido.
  it('el sidebar de escritorio está oculto por debajo de lg y visible desde lg, con las 9 secciones', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('nav[aria-label="Secciones de configuración"]');
    const buttons = nav?.querySelectorAll('button');

    expect(nav?.className).toContain('hidden');
    expect(nav?.className).toContain('lg:flex');
    expect(nav?.className).toContain('lg:flex-col');
    expect(buttons?.length).toBe(9);
  });

  it('el select cubre mobile y tablet (oculto solo desde lg), con las mismas 9 opciones', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();

    const mobileWrapper = fixture.nativeElement.querySelector('.lg\\:hidden');
    const options = mobileWrapper?.querySelectorAll('option');

    expect(options?.length).toBe(9);
  });

  it('click en un ítem del sidebar cambia de tab directamente', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const nav = fixture.nativeElement.querySelector('nav[aria-label="Secciones de configuración"]');
    const billingButton = Array.from(nav.querySelectorAll('button')).find((btn) =>
      (btn as HTMLElement).textContent?.includes('Facturación'),
    ) as HTMLElement;
    billingButton.click();

    expect(component.activeTab()).toBe('billing');
  });

  // F7-R3: ?tab=&suggested= navegan directo a la pestaña de planes con el
  // plan sugerido resaltado (CTA de upgrade desde otra pantalla).
  it('lee ?tab=plan de la URL y abre directo esa pestaña', () => {
    configure({ tab: 'plan' });
    const component = createComponent();

    expect(component.activeTab()).toBe('plan');
  });

  it('lee ?suggested= de la URL y lo expone para resaltar el plan sugerido', () => {
    configure({ tab: 'plan', suggested: 'ESTUDIO' });
    const component = createComponent();

    expect(component.suggestedPlanCode()).toBe('ESTUDIO');
  });

  it('ignora un ?tab= que no es una pestaña válida y se queda en la pestaña por defecto', () => {
    configure({ tab: 'no-existe' });
    const component = createComponent();

    expect(component.activeTab()).toBe('legal');
  });

  it('sin ?suggested= en la URL, suggestedPlanCode queda en null', () => {
    const component = createComponent();

    expect(component.suggestedPlanCode()).toBeNull();
  });

  // F7-R3: el toast+CTA de upgrade lo dispara error.interceptor.ts de forma
  // centralizada (ver error.interceptor.spec.ts) — el componente solo
  // revierte el checkbox, no muestra su propio mensaje ni dispara el CTA.
  it('onSubmitSecurity: si el error es un gate de plan, revierte el checkbox sin mostrar error propio', () => {
    const gateError = { error: { code: 'FEATURE_NOT_IN_PLAN', message: 'Tu plan actual no incluye esta funcionalidad' } };
    planUpgradeMock.isPlanGateError.mockReturnValue(true);
    companyServiceMock.updateCompany.mockReturnValue(throwError(() => gateError));
    const component = createComponent();
    component.securityForm.patchValue({ require2fa: true });

    component.onSubmitSecurity();

    expect(planUpgradeMock.promptUpgrade).not.toHaveBeenCalled();
    expect(component.securityForm.get('require2fa')?.value).toBe(false);
    expect(component.securityError()).toBeNull();
    expect(component.isSubmittingSecurity()).toBe(false);
  });

  it('onSubmitSecurity: en un error que no es de plan, muestra el mensaje real y no llama al CTA de upgrade', () => {
    companyServiceMock.updateCompany.mockReturnValue(throwError(() => ({ message: 'Dato inválido' })));
    const component = createComponent();

    component.onSubmitSecurity();

    expect(planUpgradeMock.promptUpgrade).not.toHaveBeenCalled();
    expect(component.securityError()).toBe('Dato inválido');
    expect(toastServiceMock.error).toHaveBeenCalledWith('Dato inválido');
  });

  it('onSubmitSecurity: en éxito guarda la política y muestra el toast', () => {
    const updated: CompanyProfile = { ...baseCompany, require2fa: true };
    companyServiceMock.updateCompany.mockReturnValue(of(updated));
    const component = createComponent();

    component.onSubmitSecurity();

    expect(component.company()?.require2fa).toBe(true);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Política de seguridad guardada correctamente.');
  });
});
