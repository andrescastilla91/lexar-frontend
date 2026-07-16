import { AbstractControl, ValidationErrors } from '@angular/forms';

export function identificationNumberValidator(control: AbstractControl): ValidationErrors | null {
  const documentType = control.get('documentType')?.value;
  const identificationNumber = control.get('identificationNumber')?.value;

  if (!documentType || !identificationNumber) {
    return null;
  }

  if (documentType === 'NIT') {
    const nitPattern = /^[89]\d{8,9}$/;
    if (!nitPattern.test(identificationNumber)) {
      return { invalidNit: 'El NIT debe empezar con 8 o 9 y tener entre 9 y 10 dígitos' };
    }
  }

  if (documentType === 'CC') {
    const cedulaPattern = /^\d{6,10}$/;
    if (!cedulaPattern.test(identificationNumber)) {
      return { invalidCedula: 'La cédula debe tener entre 6 y 10 dígitos' };
    }
  }

  return null;
}
