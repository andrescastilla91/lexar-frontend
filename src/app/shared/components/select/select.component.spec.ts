import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectComponent, SelectItem } from './select.component';

const FEW: SelectItem[] = [
  { value: 'A', label: 'Persona jurídica' },
  { value: 'B', label: 'Persona natural', description: 'Sin empresa' },
];

const MANY: SelectItem[] = Array.from({ length: 12 }, (_, i) => ({ value: `m${i}`, label: `Municipio ${i}` })).concat([
  { value: 'bog', label: 'Bogotá D.C.' },
]);

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, SelectComponent],
  template: `
    <label>
      Tipo
      <app-select
        [formControl]="control"
        [items]="items"
        [emptyLabel]="emptyLabel"
        [emptyValue]="emptyValue"
        [invalid]="invalid"
        (valueChange)="changes.push($event)"
      />
    </label>
  `,
})
class HostComponent {
  control = new FormControl<string | null>('');
  items: SelectItem[] = FEW;
  emptyLabel: string | null = null;
  emptyValue: string | null = '';
  invalid = false;
  changes: Array<string | null> = [];
}

describe('SelectComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const root = () => fixture.nativeElement as HTMLElement;
  const trigger = () => root().querySelector('button[role="combobox"]') as HTMLButtonElement;
  const options = () => Array.from(root().querySelectorAll<HTMLElement>('[role="option"]'));
  const key = (el: HTMLElement, k: string) => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const open = () => {
    trigger().click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra el texto de ayuda cuando no hay valor y la etiqueta cuando lo hay', () => {
    expect(trigger().textContent).toContain('Selecciona…');

    host.control.setValue('B');
    fixture.detectChanges();

    expect(trigger().textContent).toContain('Persona natural');
  });

  it('abre al hacer clic, lista las opciones y elige una: actualiza el control, emite y cierra', () => {
    open();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(options().map((o) => o.textContent?.trim())).toEqual(['Persona jurídica', 'Persona naturalSin empresa']);

    options()[1].click();
    fixture.detectChanges();

    expect(host.control.value).toBe('B');
    expect(host.changes).toEqual(['B']);
    expect(options()).toHaveLength(0);
    expect(trigger().textContent).toContain('Persona natural');
  });

  it('dentro de un <label>, elegir una opción no vuelve a abrir la lista', () => {
    open();

    options()[0].click();
    fixture.detectChanges();

    expect(options()).toHaveLength(0);
    expect(host.control.value).toBe('A');
  });

  it('marca la opción seleccionada con aria-selected', () => {
    host.control.setValue('A');
    fixture.detectChanges();

    open();

    expect(options().map((o) => o.getAttribute('aria-selected'))).toEqual(['true', 'false']);
  });

  it('la opción vacía emite emptyValue (null) y deja el texto de la opción', () => {
    host.emptyLabel = 'Sin selección';
    host.emptyValue = null;
    host.control.setValue('A');
    fixture.detectChanges();

    open();
    expect(options()[0].textContent).toContain('Sin selección');
    options()[0].click();
    fixture.detectChanges();

    expect(host.control.value).toBeNull();
    expect(trigger().textContent).toContain('Sin selección');
  });

  it('con pocas opciones no muestra buscador; con muchas, sí, y filtra sin distinguir tildes', () => {
    open();
    expect(root().querySelector('input[aria-label="Buscar"]')).toBeNull();
    key(trigger(), 'Escape');

    host.items = MANY;
    fixture.detectChanges();
    open();
    const search = root().querySelector('input[aria-label="Buscar"]') as HTMLInputElement;
    expect(search).not.toBeNull();

    search.value = 'bogota';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(options().map((o) => o.textContent?.trim())).toEqual(['Bogotá D.C.']);

    search.value = 'zzz';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root().textContent).toContain('Sin resultados');
  });

  it('teclado: flecha abajo abre, flechas mueven y Enter elige', () => {
    key(trigger(), 'ArrowDown');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    key(trigger(), 'ArrowDown');
    key(trigger(), 'Enter');

    expect(host.control.value).toBe('B');
    expect(options()).toHaveLength(0);
  });

  it('Escape y el clic fuera cierran la lista', () => {
    open();
    key(trigger(), 'Escape');
    expect(options()).toHaveLength(0);

    open();
    document.body.click();
    fixture.detectChanges();
    expect(options()).toHaveLength(0);
  });

  it('búsqueda por letra con la lista cerrada elige la primera coincidencia', () => {
    key(trigger(), 'p');
    expect(host.control.value).toBe('A');
  });

  it('deshabilitado desde el formulario no abre', () => {
    host.control.disable();
    fixture.detectChanges();

    expect(trigger().disabled).toBe(true);
    trigger().click();
    fixture.detectChanges();
    expect(options()).toHaveLength(0);
  });

  it('marca el borde y aria-invalid cuando es inválido', () => {
    host.invalid = true;
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-invalid')).toBe('true');
    expect(trigger().className).toContain('border-danger');
  });

  it('al cerrar queda marcado como tocado', () => {
    open();
    key(trigger(), 'Escape');

    expect(host.control.touched).toBe(true);
  });
});

@Component({
  standalone: true,
  imports: [SelectComponent],
  template: `<app-select [items]="items" [value]="value" (valueChange)="value = $event" />`,
})
class StandaloneHostComponent {
  items = FEW;
  value: string | null = 'A';
}

describe('SelectComponent sin formularios ([value] + (valueChange))', () => {
  it('refleja el valor de entrada y lo actualiza al elegir', () => {
    const fixture = TestBed.configureTestingModule({ imports: [StandaloneHostComponent] }).createComponent(
      StandaloneHostComponent,
    );
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button[role="combobox"]') as HTMLButtonElement;
    expect(button.textContent).toContain('Persona jurídica');

    button.click();
    fixture.detectChanges();
    (el.querySelectorAll('[role="option"]')[1] as HTMLElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value).toBe('B');
    expect(button.textContent).toContain('Persona natural');
  });
});
