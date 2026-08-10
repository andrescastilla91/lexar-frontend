import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ProfileInfoFormComponent } from './profile-info-form.component';

describe('ProfileInfoFormComponent', () => {
  function createComponent() {
    const fb = TestBed.inject(FormBuilder);
    const fixture = TestBed.createComponent(ProfileInfoFormComponent);
    const form = fb.nonNullable.group({
      firstName: [''],
      lastName: [''],
      phone: [''],
      themePreference: ['system' as 'light' | 'dark' | 'system'],
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

  it('emite avatarSelected con el archivo elegido', () => {
    const { component } = createComponent();
    const avatarSpy = jest.fn();
    component.avatarSelected.subscribe(avatarSpy);

    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    component.onFileSelected({ target: input } as unknown as Event);

    expect(avatarSpy).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });

  it('no emite avatarSelected si no hay archivo', () => {
    const { component } = createComponent();
    const avatarSpy = jest.fn();
    component.avatarSelected.subscribe(avatarSpy);

    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [] });

    component.onFileSelected({ target: input } as unknown as Event);

    expect(avatarSpy).not.toHaveBeenCalled();
  });
});
