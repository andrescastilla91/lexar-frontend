import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CatalogItem } from '../../../core/models/catalog-backend.model';

/**
 * Códigos de tipo de documento con validación estricta específica.
 * Cualquier otro código de catálogo (existente o creado por el tenant) cae
 * en la validación genérica de `genericPattern`.
 * Decisión de producto (F25): estricta solo para CC/NIT, genérica para el resto.
 */
const NIT_PATTERN = /^[89]\d{8,9}$/;
const CEDULA_PATTERN = /^\d{6,10}$/;
const GENERIC_PATTERN = /^[A-Za-z0-9]{5,20}$/;

/**
 * Valida `identificationNumber` según el código del `documentTypeId` seleccionado.
 * Recibe un getter de la lista de catalog items de tipo document_type (en vez de
 * un array fijo) porque el catálogo se carga async después de construir el form.
 */
export function identificationNumberValidator(getDocumentTypes: () => CatalogItem[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const documentTypeId = control.get('documentTypeId')?.value;
    const identificationNumber = control.get('identificationNumber')?.value;

    if (!documentTypeId || !identificationNumber) {
      return null;
    }

    const documentType = getDocumentTypes().find((item) => item.id === documentTypeId);
    const code = documentType?.code;

    if (code === 'NIT') {
      if (!NIT_PATTERN.test(identificationNumber)) {
        return { invalidNit: 'El NIT debe empezar con 8 o 9 y tener entre 9 y 10 dígitos' };
      }
      return null;
    }

    if (code === 'CC') {
      if (!CEDULA_PATTERN.test(identificationNumber)) {
        return { invalidCedula: 'La cédula debe tener entre 6 y 10 dígitos' };
      }
      return null;
    }

    if (!GENERIC_PATTERN.test(identificationNumber)) {
      return { invalidIdentification: 'El número de identificación debe tener entre 5 y 20 caracteres alfanuméricos' };
    }

    return null;
  };
}
