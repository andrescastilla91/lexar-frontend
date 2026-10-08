import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SettingsPlanComponent } from './settings-plan.component';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { AiChatService } from '../../../core/services/ai-chat.service';
import { Entitlements, PlanCatalogEntry, SaasInvoice } from '../../../core/models/subscription-backend.model';
import { AiUsageSummary } from '../../../core/models/ai-chat.model';

describe('SettingsPlanComponent', () => {
  let subscriptionServiceMock: {
    getEntitlements: jest.Mock;
    getPlanCatalog: jest.Mock;
    listInvoices: jest.Mock;
    isSimulationEnabled: jest.Mock;
    downloadInvoice: jest.Mock;
    simulateSubscription: jest.Mock;
    createCheckout: jest.Mock;
    cancelAtPeriodEnd: jest.Mock;
    getBillingReadiness: jest.Mock;
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };
  let aiChatServiceMock: { getUsage: jest.Mock };

  const aiUsage: AiUsageSummary = { used: 7, limit: 20, periodStart: '2026-09-01', periodEnd: '2026-10-01' };

  const entitlements: Entitlements = {
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
    limits: {
      maxUsers: 10,
      maxActiveProcesses: 100,
      maxStorageMb: 10240,
      aiCreditsMonth: 50,
      portalClientsMax: null,
    },
    usage: { users: 3, activeProcesses: 5, storageMb: 120 },
  };

  const plans: PlanCatalogEntry[] = [
    {
      code: 'TRIAL',
      name: 'Prueba gratuita',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'COP',
      maxUsers: 10,
      maxActiveProcesses: 100,
      maxStorageMb: 10240,
      aiCreditsMonth: 50,
      portalClientsMax: null,
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
      sortOrder: 0,
    },
    {
      code: 'INDEPENDIENTE',
      name: 'Independiente',
      priceMonthly: 89000,
      priceYearly: 890000,
      currency: 'COP',
      maxUsers: 2,
      maxActiveProcesses: 40,
      maxStorageMb: 5120,
      aiCreditsMonth: 20,
      portalClientsMax: 5,
      features: {
        chatbot: true,
        clientPortal: true,
        advancedReports: false,
        taskApprovals: false,
        customCatalogs: false,
        mandatory2faPolicy: false,
        exportableReports: false,
        exportableAudit: false,
        earlyAccess: false,
      },
      sortOrder: 1,
    },
  ];

  const invoice: SaasInvoice = {
    id: 'inv-1',
    number: 'LEXAR-000001',
    amount: 89000,
    currency: 'COP',
    status: 'paid',
    periodStart: new Date().toISOString(),
    periodEnd: new Date().toISOString(),
    pdfKey: '_internal/saas-invoices/inv-1/x.pdf',
    createdAt: new Date().toISOString(),
  };

  function configure(): void {
    subscriptionServiceMock = {
      getEntitlements: jest.fn().mockReturnValue(of(entitlements)),
      getPlanCatalog: jest.fn().mockReturnValue(of(plans)),
      listInvoices: jest.fn().mockReturnValue(of([invoice])),
      isSimulationEnabled: jest.fn().mockReturnValue(of(true)),
      downloadInvoice: jest.fn(),
      simulateSubscription: jest.fn(),
      createCheckout: jest.fn(),
      cancelAtPeriodEnd: jest.fn(),
      getBillingReadiness: jest.fn().mockReturnValue(of({ ready: true, missing: [] })),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };
    aiChatServiceMock = { getUsage: jest.fn().mockReturnValue(of(aiUsage)) };

    TestBed.configureTestingModule({
      imports: [SettingsPlanComponent],
      providers: [
        { provide: SubscriptionService, useValue: subscriptionServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: AiChatService, useValue: aiChatServiceMock },
      ],
    });
  }

  function createComponent(suggestedPlanCode: string | null = null) {
    const fixture = TestBed.createComponent(SettingsPlanComponent);
    if (suggestedPlanCode !== null) {
      fixture.componentRef.setInput('suggestedPlanCode', suggestedPlanCode);
    }
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  afterEach(() => {
    jest.useRealTimers();
  });

  it('al inicializar carga entitlements, catálogo de planes (sin TRIAL), facturas y el flag de simulación', () => {
    const component = createComponent();

    expect(component.entitlements()).toEqual(entitlements);
    expect(component.plans().map((p) => p.code)).toEqual(['INDEPENDIENTE']);
    expect(component.invoices()).toEqual([invoice]);
    expect(component.simulationEnabled()).toBe(true);
    expect(component.isLoading()).toBe(false);
  });

  it('F7-R4: agrega la barra de cupo de IA cuando el resumen llega con limit > 0', () => {
    const component = createComponent();

    expect(aiChatServiceMock.getUsage).toHaveBeenCalled();
    expect(component.aiUsage()).toEqual(aiUsage);
    const bar = component.usageBars().find((b) => b.label === 'Cupo de IA (mensual)');
    expect(bar).toEqual({ label: 'Cupo de IA (mensual)', current: 7, max: 20, percent: 35 });
  });

  it('F7-R4: no agrega la barra de cupo de IA si el resumen falla', () => {
    aiChatServiceMock.getUsage.mockReturnValue(throwError(() => new Error('fail')));
    const component = createComponent();

    expect(component.aiUsage()).toBeNull();
    expect(component.usageBars().find((b) => b.label === 'Cupo de IA (mensual)')).toBeUndefined();
  });

  it('F7-R4: no agrega la barra de cupo de IA si el plan no tiene cupo (limit <= 0)', () => {
    aiChatServiceMock.getUsage.mockReturnValue(
      of({ used: 0, limit: 0, periodStart: '2026-09-01', periodEnd: '2026-10-01' }),
    );
    const component = createComponent();

    expect(component.usageBars().find((b) => b.label === 'Cupo de IA (mensual)')).toBeUndefined();
  });

  it('si falla la carga de entitlements, muestra un mensaje de error', () => {
    subscriptionServiceMock.getEntitlements.mockReturnValue(throwError(() => new Error('fail')));
    const component = createComponent();

    expect(component.loadError()).toBe('No se pudo cargar la información de tu plan.');
    expect(component.isLoading()).toBe(false);
  });

  it('checkout() no hace nada si el usuario cancela el diálogo de confirmación', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const component = createComponent();

    await component.checkout('INDEPENDIENTE');

    expect(subscriptionServiceMock.simulateSubscription).not.toHaveBeenCalled();
    expect(subscriptionServiceMock.createCheckout).not.toHaveBeenCalled();
  });

  it('checkout() ignora clics repetidos mientras ya hay uno en curso', async () => {
    const component = createComponent();
    component.isCheckingOut.set(true);

    await component.checkout('INDEPENDIENTE');

    expect(confirmDialogMock.confirm).not.toHaveBeenCalled();
  });

  it('checkout() en modo simulación: confirma, simula, muestra toast y recarga entitlements/facturas', async () => {
    subscriptionServiceMock.simulateSubscription.mockReturnValue(of({ message: 'Evento simulado aplicado' }));
    const component = createComponent();

    await component.checkout('INDEPENDIENTE');

    expect(confirmDialogMock.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Simular contratación de plan' }),
    );
    expect(subscriptionServiceMock.simulateSubscription).toHaveBeenCalledWith('INDEPENDIENTE');
    expect(subscriptionServiceMock.createCheckout).not.toHaveBeenCalled();
    expect(toastServiceMock.success).toHaveBeenCalledWith('Suscripción y factura simuladas correctamente.');
    expect(component.isCheckingOut()).toBe(false);
    // reloadAfterCheckout dispara un segundo GET de entitlements además del de ngOnInit.
    expect(subscriptionServiceMock.getEntitlements).toHaveBeenCalledTimes(2);
    expect(subscriptionServiceMock.listInvoices).toHaveBeenCalledTimes(2);
  });

  it('checkout() en modo simulación: si falla, muestra toast de error y libera isCheckingOut', async () => {
    subscriptionServiceMock.simulateSubscription.mockReturnValue(throwError(() => new Error('No se pudo simular')));
    const component = createComponent();

    await component.checkout('INDEPENDIENTE');

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo simular');
    expect(component.isCheckingOut()).toBe(false);
  });

  it('checkout() en modo real (sin simulación): confirma y llama al checkout real de la pasarela', async () => {
    jest.useFakeTimers();
    subscriptionServiceMock.isSimulationEnabled.mockReturnValue(of(false));
    subscriptionServiceMock.createCheckout.mockReturnValue(
      of({ url: 'https://checkout.wompi.co/p/?x=1', reference: 'ref-1' }),
    );
    const component = createComponent();

    await component.checkout('INDEPENDIENTE');
    // No se avanza el temporizador: evita que jsdom intente navegar de verdad
    // (window.location.href) durante o después del test.

    expect(confirmDialogMock.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Ir a la pasarela de pago' }),
    );
    expect(subscriptionServiceMock.createCheckout).toHaveBeenCalledWith({
      planCode: 'INDEPENDIENTE',
      billingCycle: 'monthly',
    });
    expect(subscriptionServiceMock.simulateSubscription).not.toHaveBeenCalled();
    expect(toastServiceMock.success).toHaveBeenCalledWith('Redirigiendo a la pasarela de pago…');
  });

  it('checkout() en modo real: si falla, muestra toast de error y libera isCheckingOut', async () => {
    subscriptionServiceMock.isSimulationEnabled.mockReturnValue(of(false));
    subscriptionServiceMock.createCheckout.mockReturnValue(throwError(() => new Error('No se pudo iniciar el pago')));
    const component = createComponent();

    await component.checkout('INDEPENDIENTE');

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo iniciar el pago');
    expect(component.isCheckingOut()).toBe(false);
  });

  describe('datos de facturación para el primer plan de pago (F45)', () => {
    const incomplete = {
      ready: false,
      missing: [
        { code: 'RUT_DOCUMENT', label: 'RUT cargado', section: 'billing' },
        { code: 'PERSON_TYPE', label: 'Tipo de persona', section: 'billing' },
      ],
    };

    function createWithFixture() {
      const fixture = TestBed.createComponent(SettingsPlanComponent);
      fixture.detectChanges();
      return fixture;
    }

    it('en Trial con datos incompletos muestra el aviso con lo pendiente y un botón para completarlos', () => {
      subscriptionServiceMock.getBillingReadiness.mockReturnValue(of(incomplete));
      const fixture = createWithFixture();
      const requested = jest.fn();
      fixture.componentInstance.sectionRequested.subscribe(requested);

      const banner = fixture.nativeElement.querySelector('[data-test="billing-incomplete"]') as HTMLElement;
      expect(banner.textContent).toContain('rut cargado, tipo de persona');

      (banner.querySelector('button') as HTMLButtonElement).click();
      expect(requested).toHaveBeenCalledWith('billing');
    });

    it('con los datos completos no muestra el aviso', () => {
      const fixture = createWithFixture();

      expect(fixture.nativeElement.querySelector('[data-test="billing-incomplete"]')).toBeNull();
    });

    it('un plan que no es Trial no muestra el aviso aunque falten datos', () => {
      subscriptionServiceMock.getEntitlements.mockReturnValue(
        of({ ...entitlements, planCode: 'ESTUDIO', status: 'active' }),
      );
      subscriptionServiceMock.getBillingReadiness.mockReturnValue(of(incomplete));
      const fixture = createWithFixture();

      expect(fixture.nativeElement.querySelector('[data-test="billing-incomplete"]')).toBeNull();
    });

    it('checkout() desde Trial con datos incompletos no abre el diálogo ni llama a la pasarela y lleva a Facturación', async () => {
      subscriptionServiceMock.getBillingReadiness.mockReturnValue(of(incomplete));
      const component = createComponent();
      const requested = jest.fn();
      component.sectionRequested.subscribe(requested);

      await component.checkout('INDEPENDIENTE');

      expect(toastServiceMock.error).toHaveBeenCalledWith(
        'Completa los datos de facturación de tu empresa para contratar un plan de pago.',
      );
      expect(requested).toHaveBeenCalledWith('billing');
      expect(confirmDialogMock.confirm).not.toHaveBeenCalled();
      expect(subscriptionServiceMock.simulateSubscription).not.toHaveBeenCalled();
      expect(subscriptionServiceMock.createCheckout).not.toHaveBeenCalled();
    });

    it('checkout() de quien ya paga no se bloquea aunque el estado diga que faltan datos', async () => {
      subscriptionServiceMock.getEntitlements.mockReturnValue(
        of({ ...entitlements, planCode: 'ESTUDIO', status: 'active' }),
      );
      subscriptionServiceMock.getBillingReadiness.mockReturnValue(of(incomplete));
      subscriptionServiceMock.simulateSubscription.mockReturnValue(of({ message: 'ok' }));
      const component = createComponent();

      await component.checkout('FIRMA');

      expect(subscriptionServiceMock.simulateSubscription).toHaveBeenCalledWith('FIRMA');
    });

    it('si no se puede consultar el estado (403) deja intentar y manda el servidor', async () => {
      subscriptionServiceMock.getBillingReadiness.mockReturnValue(throwError(() => new Error('403')));
      subscriptionServiceMock.simulateSubscription.mockReturnValue(of({ message: 'ok' }));
      const component = createComponent();

      await component.checkout('INDEPENDIENTE');

      expect(subscriptionServiceMock.simulateSubscription).toHaveBeenCalledWith('INDEPENDIENTE');
    });

    it('si el servidor rechaza por datos incompletos, muestra su mensaje y vuelve a consultar el estado', async () => {
      subscriptionServiceMock.simulateSubscription.mockReturnValue(
        throwError(() => new Error('Completa los datos de facturación de tu empresa antes de contratar un plan de pago')),
      );
      const component = createComponent();
      expect(subscriptionServiceMock.getBillingReadiness).toHaveBeenCalledTimes(1);

      await component.checkout('INDEPENDIENTE');

      expect(toastServiceMock.error).toHaveBeenCalledWith(
        'Completa los datos de facturación de tu empresa antes de contratar un plan de pago',
      );
      expect(subscriptionServiceMock.getBillingReadiness).toHaveBeenCalledTimes(2);
    });
  });

  it('downloadInvoice() abre la URL firmada en una pestaña nueva', () => {
    subscriptionServiceMock.downloadInvoice.mockReturnValue(of('https://signed.example/x.pdf'));
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const component = createComponent();

    component.downloadInvoice('inv-1');

    expect(subscriptionServiceMock.downloadInvoice).toHaveBeenCalledWith('inv-1');
    expect(openSpy).toHaveBeenCalledWith('https://signed.example/x.pdf', '_blank');
  });

  it('cancel() no cancela la suscripción si el usuario rechaza el diálogo', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const component = createComponent();

    await component.cancel();

    expect(subscriptionServiceMock.cancelAtPeriodEnd).not.toHaveBeenCalled();
  });

  it('cancel() al confirmar, cancela al final del período y actualiza el estado local', async () => {
    subscriptionServiceMock.cancelAtPeriodEnd.mockReturnValue(
      of({ message: 'Se cancelará al final del período', cancelAtPeriodEnd: true, effectiveAt: entitlements.currentPeriodEnd }),
    );
    const component = createComponent();

    await component.cancel();

    expect(toastServiceMock.success).toHaveBeenCalledWith('Se cancelará al final del período');
    expect(component.entitlements()?.cancelAtPeriodEnd).toBe(true);
  });

  // F7-R3: la tabla comparativa es un componente hijo real (no un mock) —
  // esto verifica que el input llega hasta el DOM que renderiza.
  it('sin plan sugerido, no muestra el badge de "Plan sugerido para ti"', () => {
    const fixture = TestBed.createComponent(SettingsPlanComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Plan sugerido para ti');
  });

  it('con suggestedPlanCode, la tabla comparativa resalta ese plan', () => {
    const fixture = TestBed.createComponent(SettingsPlanComponent);
    fixture.componentRef.setInput('suggestedPlanCode', 'INDEPENDIENTE');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Plan sugerido para ti');
  });
});
