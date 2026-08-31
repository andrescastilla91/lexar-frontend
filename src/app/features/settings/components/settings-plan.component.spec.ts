import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SettingsPlanComponent } from './settings-plan.component';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { Entitlements, PlanCatalogEntry, SaasInvoice } from '../../../core/models/subscription-backend.model';

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
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

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
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SettingsPlanComponent],
      providers: [
        { provide: SubscriptionService, useValue: subscriptionServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastServiceMock },
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
