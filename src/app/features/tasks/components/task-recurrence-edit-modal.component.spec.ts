import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TaskRecurrenceEditModalComponent } from './task-recurrence-edit-modal.component';
import { TaskRecurrencesService } from '../../../core/services/task-recurrences.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  RecurrenceFrequency,
  TaskRecurrenceResponse,
  TaskRecurrenceStatus,
} from '../../../core/models/task-recurrence.model';
import { TaskPriority } from '../../../core/models/task.model';

describe('TaskRecurrenceEditModalComponent', () => {
  let fixture: ComponentFixture<TaskRecurrenceEditModalComponent>;
  let component: TaskRecurrenceEditModalComponent;
  let recurrencesServiceMock: { update: jest.Mock };
  let toastMock: { success: jest.Mock; error: jest.Mock };

  const recurrence: TaskRecurrenceResponse = {
    id: 'rec-1',
    title: 'Revisión mensual',
    description: 'Contrato marco',
    processId: null,
    process: null,
    clientId: null,
    client: null,
    assigneeUserId: 'user-1',
    assignee: { id: 'user-1', firstName: 'Ana', lastName: 'Ríos' },
    priority: TaskPriority.HIGH,
    frequency: RecurrenceFrequency.MONTHLY,
    startDate: '2026-11-05',
    dueTime: '09:30',
    endDate: null,
    maxOccurrences: 6,
    generatedCount: 2,
    status: TaskRecurrenceStatus.ACTIVE,
    nextOccurrenceDate: '2027-01-05',
    lastTaskId: 'task-2',
    stoppedAt: null,
    createdBy: 'user-1',
    createdAt: '2026-10-06T00:00:00.000Z',
    updatedAt: '2026-10-06T00:00:00.000Z',
  };

  function setup(): void {
    recurrencesServiceMock = { update: jest.fn().mockReturnValue(of(recurrence)) };
    toastMock = { success: jest.fn(), error: jest.fn() };
    TestBed.configureTestingModule({
      imports: [TaskRecurrenceEditModalComponent],
      providers: [
        { provide: TaskRecurrencesService, useValue: recurrencesServiceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });
    fixture = TestBed.createComponent(TaskRecurrenceEditModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('recurrence', recurrence);
    fixture.detectChanges();
  }

  it('precarga la plantilla y la regla de la serie', () => {
    setup();

    expect(component.form.getRawValue()).toEqual({
      title: 'Revisión mensual',
      description: 'Contrato marco',
      assigneeUserId: 'user-1',
      priority: TaskPriority.HIGH,
      dueTime: '09:30',
    });
    expect(component.ruleForm.getRawValue()).toEqual({
      repeat: true,
      frequency: RecurrenceFrequency.MONTHLY,
      endMode: 'COUNT',
      endDate: '',
      maxOccurrences: 6,
    });
  });

  it('guardar envía plantilla y regla, avisa y cierra', () => {
    setup();
    const updated = jest.fn();
    const closed = jest.fn();
    component.updated.subscribe(updated);
    component.close.subscribe(closed);
    component.form.patchValue({ title: 'Revisión trimestral', assigneeUserId: '' });
    component.ruleForm.patchValue({
      frequency: RecurrenceFrequency.QUARTERLY,
      endMode: 'DATE',
      endDate: '2027-12-31',
    });

    component.submit();

    expect(recurrencesServiceMock.update).toHaveBeenCalledWith('rec-1', {
      title: 'Revisión trimestral',
      description: 'Contrato marco',
      assigneeUserId: null,
      priority: TaskPriority.HIGH,
      dueTime: '09:30',
      frequency: RecurrenceFrequency.QUARTERLY,
      endDate: '2027-12-31',
      maxOccurrences: null,
    });
    expect(toastMock.success).toHaveBeenCalled();
    expect(updated).toHaveBeenCalledWith(recurrence);
    expect(closed).toHaveBeenCalled();
  });

  it('un fin inválido muestra el error y no llama al servicio', () => {
    setup();
    component.ruleForm.patchValue({ endMode: 'DATE', endDate: '' });

    component.submit();

    expect(recurrencesServiceMock.update).not.toHaveBeenCalled();
    expect(component.formError()).toContain('fecha');
  });

  it('título vacío no se envía', () => {
    setup();
    component.form.patchValue({ title: '' });

    component.submit();

    expect(recurrencesServiceMock.update).not.toHaveBeenCalled();
    expect(component.formError()).toBe('Completa los campos obligatorios.');
  });

  it('si el backend falla muestra el mensaje y rehabilita el envío', () => {
    setup();
    recurrencesServiceMock.update.mockReturnValue(
      throwError(() => new Error('La serie ya no está activa y no admite cambios')),
    );

    component.submit();

    expect(component.formError()).toBe('La serie ya no está activa y no admite cambios');
    expect(toastMock.error).toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
  });

  it('no reenvía mientras hay un envío en curso', () => {
    setup();
    component.isSubmitting.set(true);

    component.submit();

    expect(recurrencesServiceMock.update).not.toHaveBeenCalled();
  });
});
