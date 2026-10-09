import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { TaskRecurrenceFieldsComponent } from './task-recurrence-fields.component';
import { createRecurrenceForm } from '../utils/task-recurrence-form.util';

describe('TaskRecurrenceFieldsComponent', () => {
  let fixture: ComponentFixture<TaskRecurrenceFieldsComponent>;
  let form: ReturnType<typeof createRecurrenceForm>;

  const host = (): HTMLElement => fixture.nativeElement;

  function setup(showToggle = true): void {
    TestBed.configureTestingModule({ imports: [TaskRecurrenceFieldsComponent] });
    form = createRecurrenceForm(TestBed.inject(FormBuilder).nonNullable);
    fixture = TestBed.createComponent(TaskRecurrenceFieldsComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('showToggle', showToggle);
    fixture.detectChanges();
  }

  it('con interruptor apagado solo muestra "Repetir esta tarea"', () => {
    setup();

    expect(host().textContent).toContain('Repetir esta tarea');
    expect(host().querySelector('select[formcontrolname="frequency"]')).toBeNull();
  });

  it('al encender el interruptor aparecen periodicidad y fin', () => {
    setup();

    form.controls.repeat.setValue(true);
    fixture.detectChanges();

    const frequency = host().querySelector(
      'select[formcontrolname="frequency"]',
    ) as HTMLSelectElement;
    expect(frequency).not.toBeNull();
    expect(Array.from(frequency.options).map((o) => o.textContent?.trim())).toEqual([
      'Diaria',
      'Semanal',
      'Mensual',
      'Trimestral',
      'Anual',
    ]);
    expect(host().querySelector('select[formcontrolname="endMode"]')).not.toBeNull();
    expect(host().querySelector('input[formcontrolname="endDate"]')).toBeNull();
    expect(host().querySelector('input[formcontrolname="maxOccurrences"]')).toBeNull();
  });

  it('muestra fecha de fin o número de ocurrencias según cómo termina la serie', () => {
    setup();
    form.controls.repeat.setValue(true);

    form.controls.endMode.setValue('DATE');
    fixture.detectChanges();
    expect(host().querySelector('input[formcontrolname="endDate"]')).not.toBeNull();
    expect(host().querySelector('input[formcontrolname="maxOccurrences"]')).toBeNull();

    form.controls.endMode.setValue('COUNT');
    fixture.detectChanges();
    expect(host().querySelector('input[formcontrolname="endDate"]')).toBeNull();
    expect(host().querySelector('input[formcontrolname="maxOccurrences"]')).not.toBeNull();
  });

  it('sin interruptor (edición de la serie) la regla siempre está visible', () => {
    setup(false);

    expect(host().querySelector('input[type="checkbox"]')).toBeNull();
    expect(host().querySelector('select[formcontrolname="frequency"]')).not.toBeNull();
  });
});
