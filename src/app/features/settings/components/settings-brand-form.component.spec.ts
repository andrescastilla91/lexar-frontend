import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { SettingsBrandFormComponent } from './settings-brand-form.component';

describe('SettingsBrandFormComponent', () => {
  function createComponent() {
    const fb = TestBed.inject(FormBuilder);
    const fixture = TestBed.createComponent(SettingsBrandFormComponent);
    const form = fb.nonNullable.group({ website: [''] });
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

  it('emite logoSelected con el archivo elegido', () => {
    const { component } = createComponent();
    const logoSpy = jest.fn();
    component.logoSelected.subscribe(logoSpy);

    const file = new File(['x'], 'logo.png', { type: 'image/png' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    component.onFileSelected({ target: input } as unknown as Event);

    expect(logoSpy).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });

  it('no emite logoSelected si no hay archivo', () => {
    const { component } = createComponent();
    const logoSpy = jest.fn();
    component.logoSelected.subscribe(logoSpy);

    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [] });

    component.onFileSelected({ target: input } as unknown as Event);

    expect(logoSpy).not.toHaveBeenCalled();
  });

  it('muestra la imagen del logo cuando logoUrl no es null', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('logoUrl', 'https://cdn/logo.png');
    fixture.detectChanges();

    const img: HTMLImageElement | null = fixture.nativeElement.querySelector('img');
    expect(img?.src).toBe('https://cdn/logo.png');
  });

  it('muestra el ícono por defecto cuando logoUrl es null', () => {
    const { fixture } = createComponent();

    const img: HTMLImageElement | null = fixture.nativeElement.querySelector('img');
    const svg = fixture.nativeElement.querySelector('svg');
    expect(img).toBeNull();
    expect(svg).not.toBeNull();
  });

  it('muestra el mensaje de error cuando errorMessage no es null', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('errorMessage', 'No se pudo guardar el sitio web.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo guardar el sitio web.');
  });

  it('deshabilita el input de archivo mientras isUploadingLogo es true', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isUploadingLogo', true);
    fixture.detectChanges();

    const fileInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    expect(fileInput.disabled).toBe(true);
  });
});
