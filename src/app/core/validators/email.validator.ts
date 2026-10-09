import { AbstractControl, ValidationErrors } from '@angular/forms';

// Más estricto que `Validators.email` de Angular (que acepta «a@b»): exige
// dominio con punto y una extensión de al menos dos letras, igual que el
// `@IsEmail()` del backend.
const EMAIL_PATTERN = /^[^\s@]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const INVALID_EMAIL_MESSAGE = 'Escribe un correo válido, por ejemplo nombre@empresa.com.';

/** Valida el formato del correo; el campo vacío es válido (la obligatoriedad es otra regla). */
export function optionalEmailValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return EMAIL_PATTERN.test(String(value)) ? null : { email: true };
}
