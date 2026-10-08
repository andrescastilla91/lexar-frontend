import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SettingsComponent } from './settings.component';
import { CompanyService } from '../../core/services/company.service';
import { CompanyProfile } from '../../core/models/company.model';
import { ToastService } from '../../core/services/toast.service';
import { PlanUpgradeService } from '../../core/services/plan-upgrade.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { Entitlements } from '../../core/models/subscription-backend.model';
import { PortalVisibilityPolicyService } from '../../core/services/portal-visibility-policy.service';
import { DashboardWidgetsService } from '../../core/services/dashboard-widgets.service';
import { AiChatService } from '../../core/services/ai-chat.service';
import { UsersService } from '../../core/services/users.service';
import { CompanyDocumentsService } from '../../core/services/company-documents.service';

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
    getBillingReadiness: jest.Mock;
  };
  let portalVisibilityPolicyServiceMock: { getAll: jest.Mock; update: jest.Mock };
  // F32 PR3: al abrir la pestaña "Tablero" se renderiza el
  // SettingsDashboardWidgetsComponent real — misma razón que
  // portalVisibilityPolicyServiceMock (ver comentario arriba).
  let dashboardWidgetsServiceMock: { getCompanySettings: jest.Mock; updateCompanySettings: jest.Mock };
  // F7-R4 (#292): SettingsPlanComponent también inyecta AiChatService para la
  // barra de consumo de IA — mismo motivo que subscriptionServiceMock arriba.
  let aiChatServiceMock: { getUsage: jest.Mock };
  let usersServiceMock: { getUsers: jest.Mock };
  let queryParams: Record<string, string>;
  let routerMock: { navigate: jest.Mock };

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
    onboardingCompletedAt: null,
    processCodePrefix: null,
    processCodeCounter: 0,
    workingDays: [1, 2, 3, 4, 5],
    businessHoursStart: null,
    businessHoursEnd: null,
    nonWorkingDayExceptionUsers: [],
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
      getBillingReadiness: jest.fn().mockReturnValue(of({ ready: true, missing: [] })),
    };
    // F27: al abrir la pestaña "Portal del cliente" se renderiza el
    // SettingsPortalVisibilityComponent real — igual que con SettingsPlanComponent
    // (ver comentario de subscriptionServiceMock), su dependencia hay que proveerla aquí.
    portalVisibilityPolicyServiceMock = {
      getAll: jest.fn().mockReturnValue(of([])),
      update: jest.fn(),
    };
    dashboardWidgetsServiceMock = {
      getCompanySettings: jest.fn().mockReturnValue(of([])),
      updateCompanySettings: jest.fn(),
    };
    aiChatServiceMock = {
      getUsage: jest.fn().mockReturnValue(of({ used: 7, limit: 20, periodStart: '2026-09-01', periodEnd: '2026-10-01' })),
    };
    usersServiceMock = {
      getUsers: jest.fn().mockReturnValue(of({ message: '', users: [], total: 0, page: 1, limit: 100 })),
    };
    queryParams = initialQueryParams;
    routerMock = { navigate: jest.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: CompanyService, useValue: companyServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: PlanUpgradeService, useValue: planUpgradeMock },
        { provide: SubscriptionService, useValue: subscriptionServiceMock },
        { provide: PortalVisibilityPolicyService, useValue: portalVisibilityPolicyServiceMock },
        { provide: DashboardWidgetsService, useValue: dashboardWidgetsServiceMock },
        { provide: AiChatService, useValue: aiChatServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        // F45: la sección Facturación y el aviso de la pestaña Plan consultan documentos y estado.
        { provide: CompanyDocumentsService, useValue: { list: () => of([]), upload: jest.fn(), remove: jest.fn() } },
        { provide: Router, useValue: routerMock },
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

  // F40 §PRO-06: "editable mientras no haya procesos creados" — el control
  // real se deshabilita en applyCompany(), nunca con [disabled] en la
  // plantilla junto a formControlName (ver BUG-14).
  it('processCodePrefix queda habilitado cuando la empresa aún no tiene procesos (counter = 0)', () => {
    const component = createComponent();

    expect(component.legalForm.get('processCodePrefix')?.disabled).toBe(false);
  });

  it('processCodePrefix queda deshabilitado cuando la empresa ya generó códigos (counter > 0)', () => {
    companyServiceMock.getCompany.mockReturnValue(
      of({ ...baseCompany, processCodePrefix: 'RGJ', processCodeCounter: 3 }),
    );

    const component = createComponent();

    expect(component.legalForm.get('processCodePrefix')?.value).toBe('RGJ');
    expect(component.legalForm.get('processCodePrefix')?.disabled).toBe(true);
  });

  describe('ubicación y régimen de la empresa (listas oficiales)', () => {
    it('empareja el texto libre guardado con los nombres oficiales de departamento, ciudad y régimen', () => {
      companyServiceMock.getCompany.mockReturnValue(
        of({ ...baseCompany, department: 'antioquia', city: 'medellin', taxRegime: 'Régimen común' }),
      );

      const component = createComponent();

      expect(component.legalForm.getRawValue()).toMatchObject({
        department: 'Antioquia',
        city: 'Medellín',
        taxRegime: 'VAT_RESPONSIBLE',
      });
      expect(component.legacyCity()).toBe('');
      expect(component.legacyTaxRegime()).toBe('');
    });

    it('si la ciudad guardada no está en el listado, queda vacía y se avisa', () => {
      companyServiceMock.getCompany.mockReturnValue(
        of({ ...baseCompany, department: 'Cundinamarca', city: 'Bogotá', taxRegime: 'Régimen simple' }),
      );

      const component = createComponent();

      expect(component.legalForm.getRawValue()).toMatchObject({
        department: 'Cundinamarca',
        city: '',
        taxRegime: '',
      });
      expect(component.legacyCity()).toBe('Bogotá');
      expect(component.legacyTaxRegime()).toBe('Régimen simple');
    });

    it('una empresa sin ciudad ni régimen no muestra avisos', () => {
      const component = createComponent();

      expect(component.legacyCity()).toBe('');
      expect(component.legacyTaxRegime()).toBe('');
    });

    it('onSubmitLegal envía departamento, ciudad y régimen elegidos', () => {
      companyServiceMock.updateCompany.mockReturnValue(of(baseCompany));
      const component = createComponent();
      component.legalForm.patchValue({ department: 'Antioquia', city: 'Medellín', taxRegime: 'VAT_NOT_RESPONSIBLE' });

      component.onSubmitLegal();

      expect(companyServiceMock.updateCompany.mock.calls[0][0]).toMatchObject({
        department: 'Antioquia',
        city: 'Medellín',
        taxRegime: 'VAT_NOT_RESPONSIBLE',
      });
    });
  });

  describe('validación de correos', () => {
    it('el correo de contacto y el de facturación inválidos invalidan su formulario; vacíos son válidos', () => {
      const component = createComponent();

      component.legalForm.patchValue({ email: 'no-es-correo' });
      component.billingForm.patchValue({ billingEmail: 'facturas@empresa' });
      expect(component.legalForm.get('email')?.hasError('email')).toBe(true);
      expect(component.billingForm.get('billingEmail')?.hasError('email')).toBe(true);

      component.legalForm.patchValue({ email: 'contacto@bufete.com' });
      component.billingForm.patchValue({ billingEmail: '' });
      expect(component.legalForm.get('email')?.valid).toBe(true);
      expect(component.billingForm.get('billingEmail')?.valid).toBe(true);
    });
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

  // F45
  it('onSubmitBilling envía los datos fiscales y omite el tipo de persona si no se eligió', () => {
    companyServiceMock.updateCompany.mockReturnValue(of(baseCompany));
    const component = createComponent();
    component.billingForm.patchValue({
      billingEmail: 'facturas@bufete.com',
      taxIdCheckDigit: '7',
      fiscalResponsibilities: ['O-13'],
    });

    component.onSubmitBilling();

    const sent = companyServiceMock.updateCompany.mock.calls[0][0] as Record<string, unknown>;
    expect(sent).toMatchObject({
      billingEmail: 'facturas@bufete.com',
      taxIdCheckDigit: '7',
      fiscalResponsibilities: ['O-13'],
    });
    expect('personType' in sent).toBe(false);
  });

  it('onSubmitBilling envía el tipo de persona cuando se eligió', () => {
    companyServiceMock.updateCompany.mockReturnValue(of(baseCompany));
    const component = createComponent();
    component.billingForm.patchValue({ personType: 'LEGAL_ENTITY' });

    component.onSubmitBilling();

    expect(companyServiceMock.updateCompany.mock.calls[0][0]).toMatchObject({ personType: 'LEGAL_ENTITY' });
  });

  it('los datos fiscales guardados llenan el formulario de facturación', () => {
    companyServiceMock.getCompany.mockReturnValue(
      of({
        ...baseCompany,
        personType: 'NATURAL_PERSON',
        taxIdCheckDigit: '3',
        billingContactName: 'Ana',
        fiscalAddress: 'Calle 9',
        fiscalResponsibilities: ['O-15'],
      }),
    );
    const component = createComponent();

    expect(component.billingForm.getRawValue()).toMatchObject({
      personType: 'NATURAL_PERSON',
      taxIdCheckDigit: '3',
      billingContactName: 'Ana',
      fiscalAddress: 'Calle 9',
      fiscalResponsibilities: ['O-15'],
    });
  });

  it('un dígito de verificación inválido invalida el formulario de facturación', () => {
    const component = createComponent();

    component.billingForm.patchValue({ taxIdCheckDigit: '12' });

    expect(component.billingForm.invalid).toBe(true);
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

  // F41 §CAL-04 (ola 3): se agregó la pestaña "Horario" — pasa de 11 a 12 secciones.
  it('la navegación de secciones muestra las 12 secciones (menú lateral desde lg, desplegable por debajo)', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const nav = root.querySelector('nav[aria-label="Secciones de configuración"]');
    const toggle = root.querySelector('button[aria-controls="settings-section-panel"]');

    expect(nav?.className).toContain('lg:block');
    expect(nav?.querySelectorAll('button').length).toBe(12);
    expect(toggle?.className).toContain('lg:hidden');
    expect(root.querySelector('select')).toBeNull();
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

  // F45: el aviso de la pestaña Plan lleva a Facturación sin salir de Configuración.
  it('la pantalla de planes puede pedir abrir la sección Facturación', () => {
    configure({ tab: 'plan' });
    subscriptionServiceMock.getBillingReadiness.mockReturnValue(
      of({ ready: false, missing: [{ code: 'RUT_DOCUMENT', label: 'RUT cargado', section: 'billing' }] }),
    );
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const button = fixture.nativeElement.querySelector('[data-test="billing-incomplete"] button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(component.activeTab()).toBe('billing');
    expect(routerMock.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: expect.objectContaining({ tab: 'billing' }) }),
    );
    expect(fixture.nativeElement.querySelector('app-settings-billing-section')).not.toBeNull();
  });

  // F27: verifica que la nueva pestaña se pueda abrir y cargue la política real.
  it('click en "Portal del cliente" cambia de tab y carga la política de visibilidad', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const nav = fixture.nativeElement.querySelector('nav[aria-label="Secciones de configuración"]');
    const portalButton = Array.from(nav.querySelectorAll('button')).find((btn) =>
      (btn as HTMLElement).textContent?.includes('Portal del cliente'),
    ) as HTMLElement;
    portalButton.click();
    fixture.detectChanges();

    expect(component.activeTab()).toBe('portal-visibility');
    expect(portalVisibilityPolicyServiceMock.getAll).toHaveBeenCalled();
  });

  // F32 PR3: verifica que la nueva pestaña se pueda abrir y cargue el
  // catálogo de widgets por empresa real.
  it('click en "Tablero" cambia de tab y carga la configuración de widgets', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const nav = fixture.nativeElement.querySelector('nav[aria-label="Secciones de configuración"]');
    const dashboardTabButton = Array.from(nav.querySelectorAll('button')).find((btn) =>
      (btn as HTMLElement).textContent?.includes('Tablero'),
    ) as HTMLElement;
    dashboardTabButton.click();
    fixture.detectChanges();

    expect(component.activeTab()).toBe('dashboard-widgets');
    expect(dashboardWidgetsServiceMock.getCompanySettings).toHaveBeenCalled();
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

  // F41 §CAL-04 (ola 3): pestaña "Horario".
  it('carga los usuarios de la empresa para el picker de excepción al iniciar', () => {
    createComponent();
    expect(usersServiceMock.getUsers).toHaveBeenCalledWith(1, 100);
  });

  it('applyCompany traduce workingDays (ISO) a los checkboxes del form', () => {
    const company: CompanyProfile = { ...baseCompany, workingDays: [1, 2, 3, 4, 5, 6] };
    companyServiceMock.getCompany.mockReturnValue(of(company));
    const component = createComponent();

    expect(component.scheduleForm.controls.workingDays.getRawValue()).toEqual({
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: true,
      sun: false,
    });
  });

  it('onSubmitSchedule: envía los días marcados como ISO y el horario laboral', () => {
    companyServiceMock.updateCompany.mockReturnValue(of(baseCompany));
    const component = createComponent();
    component.scheduleForm.controls.workingDays.patchValue({ sat: true });
    component.scheduleForm.patchValue({ businessHoursStart: '08:00', businessHoursEnd: '18:00' });

    component.onSubmitSchedule();

    expect(companyServiceMock.updateCompany).toHaveBeenCalledWith({
      workingDays: [1, 2, 3, 4, 5, 6],
      businessHoursStart: '08:00',
      businessHoursEnd: '18:00',
      nonWorkingDayExceptionUserIds: [],
    });
  });

  it('onSubmitSchedule: envía null cuando se limpia el horario laboral (no lo omite)', () => {
    companyServiceMock.updateCompany.mockReturnValue(of(baseCompany));
    const component = createComponent();

    component.onSubmitSchedule();

    expect(companyServiceMock.updateCompany).toHaveBeenCalledWith(
      expect.objectContaining({ businessHoursStart: null, businessHoursEnd: null }),
    );
  });

  it('onSubmitSchedule: en error muestra el mensaje y el toast', () => {
    companyServiceMock.updateCompany.mockReturnValue(throwError(() => ({ message: 'No se pudo guardar' })));
    const component = createComponent();

    component.onSubmitSchedule();

    expect(component.scheduleError()).toBe('No se pudo guardar');
    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo guardar');
  });

  it('setExceptionUserIds actualiza la selección para el próximo submit', () => {
    companyServiceMock.updateCompany.mockReturnValue(of(baseCompany));
    const component = createComponent();

    component.setExceptionUserIds(['u1', 'u2']);
    component.onSubmitSchedule();

    expect(companyServiceMock.updateCompany).toHaveBeenCalledWith(
      expect.objectContaining({ nonWorkingDayExceptionUserIds: ['u1', 'u2'] }),
    );
  });

  it('selectTab cambia de sección y deja ?tab= en la URL, limpiando tipo y suggested', () => {
    const component = createComponent();

    component.selectTab('catalogs');

    expect(component.activeTab()).toBe('catalogs');
    expect(routerMock.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { tab: 'catalogs', tipo: null, suggested: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      }),
    );
  });

  it('selectTab sobre la sección activa no navega', () => {
    const component = createComponent();

    component.selectTab('legal');

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('elegir una sección desde la navegación cambia de tab y actualiza la URL', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const entry = fixture.nativeElement.querySelector('button[data-section-id="security"]') as HTMLElement;
    entry.click();

    expect(component.activeTab()).toBe('security');
    expect(routerMock.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { tab: 'security', tipo: null, suggested: null } }),
    );
  });
});
