import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { SettingsScheduleFormComponent } from './settings-schedule-form.component';

describe('SettingsScheduleFormComponent', () => {
  function createComponent() {
    const fb = TestBed.inject(FormBuilder);
    const fixture = TestBed.createComponent(SettingsScheduleFormComponent);
    const form = fb.nonNullable.group({
      workingDays: fb.nonNullable.group({
        mon: [true],
        tue: [true],
        wed: [true],
        thu: [true],
        fri: [true],
        sat: [false],
        sun: [false],
      }),
      businessHoursStart: [''],
      businessHoursEnd: [''],
    });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, form };
  }

  it('emite submit al enviar el formulario', () => {
    const { fixture, component } = createComponent();
    const submitSpy = jest.fn();
    component.submit.subscribe(submitSpy);

    const formEl: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formEl.dispatchEvent(new Event('submit'));

    expect(submitSpy).toHaveBeenCalled();
  });

  it('renderiza los 7 checkboxes de días hábiles', () => {
    const { fixture } = createComponent();
    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(7);
  });

  it('refleja el valor del form en los checkboxes de días', () => {
    const { fixture, form } = createComponent();
    form.controls.workingDays.controls.sat.setValue(true);
    fixture.detectChanges();

    const checkboxes: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll(
      'input[type="checkbox"]',
    );
    // Orden: lunes..domingo — sábado es el índice 5.
    expect(checkboxes[5].checked).toBe(true);
  });

  it('muestra el mensaje de error cuando errorMessage no es null', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('errorMessage', 'No se pudo guardar el horario.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo guardar el horario.');
  });

  it('deshabilita el botón de guardar mientras isSubmitting es true', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
  });

  it('muestra "Cargando usuarios…" mientras isLoadingUsers es true', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isLoadingUsers', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando usuarios');
  });
});
