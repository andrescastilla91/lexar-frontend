import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { ClientFormComponent } from './client-form.component';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import { FilesService } from '../../../core/services/files.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ClientPortalInvitationsService } from '../../../core/services/client-portal-invitations.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { ToastService } from '../../../core/services/toast.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { identificationNumberValidator } from '../utils/identification-number.validator';

const documentTypes: CatalogItem[] = [
  { id: 'd1', catalogType: 'document_type', code: 'CC', label: 'Cédula', color: null, sortOrder: 0, isActive: true, isSystem: true },
];
const riskLevels: CatalogItem[] = [
  { id: 'r1', catalogType: 'risk_level', code: 'LOW', label: 'Bajo', color: '#22c55e', sortOrder: 0, isActive: true, isSystem: true },
];

function buildForm() {
  const fb = new FormBuilder();
  return fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      companyName: [''],
      phone: [''],
      email: ['', [Validators.required, Validators.email]],
      address: [''],
      documentTypeId: ['', [Validators.required]],
      identificationNumber: ['', [Validators.required]],
      riskLevelId: [''],
    },
    { validators: [identificationNumberValidator(() => documentTypes)] },
  );
}

describe('ClientFormComponent', () => {
  function configureProviders(): void {
    TestBed.configureTestingModule({
      imports: [ClientFormComponent],
      providers: [
        { provide: FilesService, useValue: { getFilesByEntity: jest.fn().mockReturnValue(of([])) } },
        { provide: ConfirmDialogService, useValue: { confirm: jest.fn() } },
        {
          provide: ClientPortalInvitationsService,
          useValue: { list: jest.fn().mockReturnValue(of({ portalUsers: [] })) },
        },
        {
          provide: SubscriptionService,
          useValue: {
            getEntitlements: jest.fn().mockReturnValue(
              of({
                planCode: 'FIRM',
                planName: 'Firma',
                status: 'active',
                isReadOnly: false,
                trialEndsAt: null,
                currentPeriodEnd: '2026-12-31',
                cancelAtPeriodEnd: false,
                features: { chatbot: false, clientPortal: true, advancedReports: false },
                limits: { maxUsers: null, maxActiveProcesses: null, maxStorageMb: null },
                usage: { users: 0, activeProcesses: 0, storageMb: 0 },
              }),
            ),
          },
        },
        { provide: ToastService, useValue: { success: jest.fn(), error: jest.fn() } },
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(true),
            hasPermission: jest.fn().mockReturnValue(true),
            userPermissions: signal(['clients.view', 'clients.invite-portal', 'files.upload', 'files.delete']),
          },
        },
      ],
    });
  }

  function createComponent(overrides: {
    isOpen?: boolean;
    isEditing?: boolean;
    isSubmitting?: boolean;
    errorMessage?: string | null;
    editingClientId?: string | null;
  } = {}) {
    const fixture = TestBed.createComponent(ClientFormComponent);
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', overrides.isOpen ?? true);
    fixture.componentRef.setInput('isEditing', overrides.isEditing ?? false);
    fixture.componentRef.setInput('isSubmitting', overrides.isSubmitting ?? false);
    fixture.componentRef.setInput('errorMessage', overrides.errorMessage ?? null);
    fixture.componentRef.setInput('editingClientId', overrides.editingClientId ?? null);
    fixture.componentRef.setInput('documentTypes', documentTypes);
    fixture.componentRef.setInput('riskLevels', riskLevels);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('no renderiza el formulario cuando isOpen es false', () => {
    configureProviders();
    const { fixture } = createComponent({ isOpen: false });
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('muestra el título de creación y no muestra el panel de archivos cuando isEditing es false', () => {
    configureProviders();
    const { fixture } = createComponent({ isEditing: false });
    expect(fixture.nativeElement.textContent).toContain('Nuevo cliente');
    expect(fixture.nativeElement.textContent).not.toContain('Archivos del cliente');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').textContent.trim()).toBe('Crear cliente');
  });

  it('con isEditing y editingClientId, muestra el panel de archivos y portal del cliente', () => {
    configureProviders();
    const { fixture } = createComponent({ isEditing: true, editingClientId: 'c1' });

    expect(fixture.nativeElement.textContent).toContain('Editar cliente');
    expect(fixture.nativeElement.textContent).toContain('Archivos del cliente');
    expect(fixture.nativeElement.textContent).toContain('Portal del cliente');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').textContent.trim()).toBe('Actualizar');
  });

  it('no muestra el panel lateral cuando isEditing es true pero no hay editingClientId', () => {
    configureProviders();
    const { fixture } = createComponent({ isEditing: true, editingClientId: null });

    expect(fixture.nativeElement.textContent).not.toContain('Archivos del cliente');
  });

  it('muestra los mensajes de validación al tocar los campos requeridos', () => {
    configureProviders();
    const { fixture, component } = createComponent();
    component.form().markAllAsTouched();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Campo requerido');
  });

  it('muestra el mensaje de error del validador de identificación', () => {
    configureProviders();
    const { fixture, component } = createComponent();
    component.form().patchValue({ documentTypeId: 'd1', identificationNumber: 'abc' });
    component.form().get('identificationNumber')?.markAsTouched();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('La cédula debe tener entre 6 y 10 dígitos');
  });

  it('muestra el mensaje de error general cuando errorMessage tiene valor', () => {
    configureProviders();
    const { fixture } = createComponent({ errorMessage: 'Error al crear cliente' });
    expect(fixture.nativeElement.textContent).toContain('Error al crear cliente');
  });

  it('deshabilita el botón de submit cuando isSubmitting es true', () => {
    configureProviders();
    const { fixture } = createComponent({ isSubmitting: true });
    const submitButton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
  });

  it('emite cancel al hacer click en cancelar', () => {
    configureProviders();
    const { fixture, component } = createComponent();
    const cancelSpy = jest.fn();
    component.cancel.subscribe(cancelSpy);

    const cancelButton = fixture.nativeElement.querySelector('button[type="button"]') as HTMLButtonElement;
    cancelButton.click();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('emite submit al enviar el formulario', () => {
    configureProviders();
    const { fixture, component } = createComponent();
    const submitSpy = jest.fn();
    component.submit.subscribe(submitSpy);

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(submitSpy).toHaveBeenCalled();
  });
});
