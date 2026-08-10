import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OnboardingComponent } from './onboarding.component';
import { CompanyService } from '../../core/services/company.service';
import { UsersService } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { CompanyProfile } from '../../core/models/company.model';

describe('OnboardingComponent', () => {
  let companyServiceMock: {
    getCompany: jest.Mock;
    updateCompany: jest.Mock;
    completeOnboarding: jest.Mock;
  };
  let usersServiceMock: { createUser: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let navigateSpy: jest.Mock;

  const company: CompanyProfile = {
    id: 'c1',
    legalName: 'Firma Test',
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
    onboardingCompletedAt: null,
    require2fa: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  function configure(): void {
    companyServiceMock = {
      getCompany: jest.fn().mockReturnValue(of(company)),
      updateCompany: jest.fn().mockReturnValue(of(company)),
      completeOnboarding: jest.fn().mockReturnValue(of({ ...company, onboardingCompletedAt: '2026-07-24T00:00:00.000Z' })),
    };
    usersServiceMock = {
      createUser: jest.fn().mockReturnValue(of({ message: 'Invitación enviada' })),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    navigateSpy = jest.fn();

    TestBed.configureTestingModule({
      imports: [OnboardingComponent],
      providers: [
        { provide: CompanyService, useValue: companyServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: Router, useValue: { navigate: navigateSpy } },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(OnboardingComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => configure());

  it('arranca en el paso 1 y carga los datos de la empresa', () => {
    const { component } = createComponent();

    expect(component.currentStep()).toBe(1);
    expect(companyServiceMock.getCompany).toHaveBeenCalled();
    expect(component.legalForm.value.legalName).toBe('Firma Test');
  });

  it('onSubmitLegal en éxito avanza al paso 2', () => {
    const { component } = createComponent();

    component.onSubmitLegal();

    expect(companyServiceMock.updateCompany).toHaveBeenCalled();
    expect(component.currentStep()).toBe(2);
    expect(toastServiceMock.success).toHaveBeenCalled();
  });

  it('onSubmitLegal en error se queda en el paso 1 y expone el mensaje', () => {
    companyServiceMock.updateCompany.mockReturnValue(throwError(() => ({ error: { message: 'No se pudo' } })));
    const { component } = createComponent();

    component.onSubmitLegal();

    expect(component.currentStep()).toBe(1);
    expect(component.legalError()).toBe('No se pudo');
  });

  it('goToStep(2) permite saltar el paso 1 sin guardar', () => {
    const { component } = createComponent();

    component.goToStep(2);

    expect(component.currentStep()).toBe(2);
    expect(companyServiceMock.updateCompany).not.toHaveBeenCalled();
  });

  it('onSubmitInvite no envía si el formulario es inválido', () => {
    const { component } = createComponent();
    component.goToStep(2);

    component.onSubmitInvite();

    expect(usersServiceMock.createUser).not.toHaveBeenCalled();
  });

  it('onSubmitInvite en éxito avanza al paso 3', () => {
    const { component } = createComponent();
    component.goToStep(2);
    component.inviteForm.setValue({ firstName: 'Ana', lastName: 'Gómez', email: 'ana@bufete.com' });

    component.onSubmitInvite();

    expect(usersServiceMock.createUser).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'Gómez',
      email: 'ana@bufete.com',
    });
    expect(component.currentStep()).toBe(3);
  });

  it('finish() completa el onboarding y navega al dashboard', () => {
    const { component } = createComponent();
    component.goToStep(3);

    component.finish();

    expect(companyServiceMock.completeOnboarding).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('finish() muestra un toast de error si falla', () => {
    companyServiceMock.completeOnboarding.mockReturnValue(throwError(() => ({ error: { message: 'Falló' } })));
    const { component } = createComponent();
    component.goToStep(3);

    component.finish();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Falló');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('si la empresa ya completó el onboarding, redirige a /dashboard y no carga el formulario', () => {
    companyServiceMock.getCompany.mockReturnValue(
      of({ ...company, onboardingCompletedAt: '2026-07-20T00:00:00.000Z' }),
    );

    const { component } = createComponent();

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    expect(component.company()).toBeNull();
  });

  it('skipLegal() pide confirmación y, si se confirma, marca el paso como saltado y avanza', async () => {
    const { component } = createComponent();

    await component.skipLegal();

    expect(confirmDialogMock.confirm).toHaveBeenCalled();
    expect(component.currentStep()).toBe(2);
  });

  it('skipLegal() no avanza si el usuario cancela la confirmación', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { component } = createComponent();

    await component.skipLegal();

    expect(component.currentStep()).toBe(1);
  });

  it('skipInvite() pide confirmación y, si se confirma, avanza al paso 3', async () => {
    const { component } = createComponent();
    component.goToStep(2);

    await component.skipInvite();

    expect(confirmDialogMock.confirm).toHaveBeenCalled();
    expect(component.currentStep()).toBe(3);
  });

  it('finish() sin pasos saltados no pide una confirmación adicional', () => {
    const { component } = createComponent();
    component.goToStep(3);

    component.finish();

    expect(confirmDialogMock.confirm).not.toHaveBeenCalled();
    expect(companyServiceMock.completeOnboarding).toHaveBeenCalled();
  });

  it('finish() con pasos saltados pide confirmación con el resumen de lo pendiente', async () => {
    const { component } = createComponent();
    await component.skipLegal();
    await component.skipInvite();

    await component.finish();

    expect(confirmDialogMock.confirm).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Configuración > Datos legales'),
      }),
    );
    expect(companyServiceMock.completeOnboarding).toHaveBeenCalled();
  });

  it('finish() con pasos saltados no completa el onboarding si se cancela la confirmación final', async () => {
    const { component } = createComponent();
    await component.skipLegal();
    confirmDialogMock.confirm.mockResolvedValue(false);

    await component.finish();

    expect(companyServiceMock.completeOnboarding).not.toHaveBeenCalled();
  });
});
