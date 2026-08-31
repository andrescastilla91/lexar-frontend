import { TestBed } from '@angular/core/testing';
import { PlanComparisonTableComponent } from './plan-comparison-table.component';
import { PlanCatalogEntry, PlanFeatures } from '../../../core/models/subscription-backend.model';

describe('PlanComparisonTableComponent', () => {
  const baseFeatures: PlanFeatures = {
    chatbot: true,
    clientPortal: true,
    advancedReports: false,
    taskApprovals: false,
    customCatalogs: false,
    mandatory2faPolicy: false,
    exportableReports: false,
    exportableAudit: false,
    earlyAccess: false,
  };

  const plans: PlanCatalogEntry[] = [
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
      features: { ...baseFeatures },
      sortOrder: 1,
    },
    {
      code: 'ESTUDIO',
      name: 'Estudio',
      priceMonthly: 249000,
      priceYearly: 2490000,
      currency: 'COP',
      maxUsers: 10,
      maxActiveProcesses: 100,
      maxStorageMb: 15360,
      aiCreditsMonth: 100,
      portalClientsMax: null,
      features: { ...baseFeatures, taskApprovals: true, customCatalogs: true, mandatory2faPolicy: true },
      sortOrder: 2,
    },
    {
      code: 'FIRMA',
      name: 'Firma',
      priceMonthly: 590000,
      priceYearly: 5900000,
      currency: 'COP',
      maxUsers: null,
      maxActiveProcesses: null,
      maxStorageMb: 51200,
      aiCreditsMonth: 500,
      portalClientsMax: null,
      features: { ...baseFeatures, taskApprovals: true, customCatalogs: true, mandatory2faPolicy: true, exportableAudit: true },
      sortOrder: 3,
    },
  ];

  function createComponent(inputs: {
    currentPlanCode: string;
    suggestedPlanCode?: string | null;
    isCheckingOut?: boolean;
  }) {
    TestBed.configureTestingModule({ imports: [PlanComparisonTableComponent] });
    const fixture = TestBed.createComponent(PlanComparisonTableComponent);
    fixture.componentRef.setInput('plans', plans);
    fixture.componentRef.setInput('currentPlanCode', inputs.currentPlanCode);
    fixture.componentRef.setInput('suggestedPlanCode', inputs.suggestedPlanCode ?? null);
    fixture.componentRef.setInput('isCheckingOut', inputs.isCheckingOut ?? false);
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza las tres columnas, una por plan', () => {
    const fixture = createComponent({ currentPlanCode: 'INDEPENDIENTE' });

    const names = Array.from(fixture.nativeElement.querySelectorAll('p.text-base.font-semibold')).map(
      (el) => (el as HTMLElement).textContent?.trim(),
    );
    expect(names).toEqual(['Independiente', 'Estudio', 'Firma']);
  });

  it('marca "Recomendado" en Estudio, sin importar el plan actual', () => {
    const fixture = createComponent({ currentPlanCode: 'INDEPENDIENTE' });

    const badges = Array.from(fixture.nativeElement.querySelectorAll('span')).map((el) =>
      (el as HTMLElement).textContent?.trim(),
    );
    expect(badges).toContain('Recomendado');
  });

  it('el plan actual muestra el botón deshabilitado con "Plan actual"', () => {
    const fixture = createComponent({ currentPlanCode: 'ESTUDIO' });

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const currentButton = buttons.find((btn) => btn.textContent?.includes('Plan actual'));
    expect(currentButton?.disabled).toBe(true);
  });

  it('resalta el plan sugerido con su propio badge', () => {
    const fixture = createComponent({ currentPlanCode: 'INDEPENDIENTE', suggestedPlanCode: 'FIRMA' });

    const badges = Array.from(fixture.nativeElement.querySelectorAll('span')).map((el) =>
      (el as HTMLElement).textContent?.trim(),
    );
    expect(badges).toContain('Plan sugerido para ti');
  });

  it('emite selectPlan con el código correcto al hacer clic en "Actualizar a"', () => {
    const fixture = createComponent({ currentPlanCode: 'INDEPENDIENTE' });
    const emitted: string[] = [];
    fixture.componentInstance.selectPlan.subscribe((code) => emitted.push(code));

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const estudioButton = buttons.find((btn) => btn.textContent?.includes('Actualizar a Estudio'));
    estudioButton?.click();

    expect(emitted).toEqual(['ESTUDIO']);
  });

  it('deshabilita los botones de actualizar mientras isCheckingOut está activo', () => {
    const fixture = createComponent({ currentPlanCode: 'INDEPENDIENTE', isCheckingOut: true });

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const estudioButton = buttons.find((btn) => btn.textContent?.includes('Actualizar a Estudio'));
    expect(estudioButton?.disabled).toBe(true);
  });

  it('los 9 flags de PlanFeatures aparecen como filas para cada plan', () => {
    const fixture = createComponent({ currentPlanCode: 'INDEPENDIENTE' });

    const firstPlanCard = fixture.nativeElement.querySelector('ul.mt-4');
    expect(firstPlanCard?.querySelectorAll('li').length).toBe(9);
  });

  it('los límites numéricos quedan en la sección plegable, no en la lista principal de capacidades', () => {
    const fixture = createComponent({ currentPlanCode: 'INDEPENDIENTE' });

    const details = fixture.nativeElement.querySelector('details');
    expect(details).toBeTruthy();
    expect(details?.textContent).toContain('Clientes en el portal');
  });
});
