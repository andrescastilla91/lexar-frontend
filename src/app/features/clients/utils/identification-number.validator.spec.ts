import { FormControl, FormGroup } from '@angular/forms';
import { identificationNumberValidator } from './identification-number.validator';
import { CatalogItem } from '../../../core/models/catalog-backend.model';

function makeDocumentType(id: string, code: string): CatalogItem {
  return {
    id,
    catalogType: 'document_type',
    code,
    label: code,
    color: null,
    sortOrder: 0,
    isActive: true,
    isSystem: true,
  };
}

const documentTypes: CatalogItem[] = [
  makeDocumentType('cc-id', 'CC'),
  makeDocumentType('nit-id', 'NIT'),
  makeDocumentType('ce-id', 'CE'),
];

function buildForm(documentTypeId: string | null, identificationNumber: string | null): FormGroup {
  return new FormGroup({
    documentTypeId: new FormControl(documentTypeId),
    identificationNumber: new FormControl(identificationNumber),
  });
}

describe('identificationNumberValidator', () => {
  const validator = identificationNumberValidator(() => documentTypes);

  it('no valida si falta el tipo de documento o el número', () => {
    expect(validator(buildForm(null, '123456'))).toBeNull();
    expect(validator(buildForm('cc-id', null))).toBeNull();
    expect(validator(buildForm(null, null))).toBeNull();
  });

  describe('CC (estricta)', () => {
    it('acepta cédulas de 6 a 10 dígitos', () => {
      expect(validator(buildForm('cc-id', '123456'))).toBeNull();
      expect(validator(buildForm('cc-id', '1234567890'))).toBeNull();
    });

    it('rechaza cédulas con letras o fuera de rango', () => {
      expect(validator(buildForm('cc-id', '12345'))).toEqual(
        expect.objectContaining({ invalidCedula: expect.any(String) }),
      );
      expect(validator(buildForm('cc-id', '12345678901'))).toEqual(
        expect.objectContaining({ invalidCedula: expect.any(String) }),
      );
      expect(validator(buildForm('cc-id', 'ABC123'))).toEqual(
        expect.objectContaining({ invalidCedula: expect.any(String) }),
      );
    });
  });

  describe('NIT (estricta)', () => {
    it('acepta NIT que empieza en 8 o 9 con 9-10 dígitos', () => {
      expect(validator(buildForm('nit-id', '900123456'))).toBeNull();
      expect(validator(buildForm('nit-id', '8001234567'))).toBeNull();
    });

    it('rechaza NIT que no empieza en 8/9 o con longitud inválida', () => {
      expect(validator(buildForm('nit-id', '700123456'))).toEqual(
        expect.objectContaining({ invalidNit: expect.any(String) }),
      );
      expect(validator(buildForm('nit-id', '900123'))).toEqual(
        expect.objectContaining({ invalidNit: expect.any(String) }),
      );
    });
  });

  describe('otros tipos de documento (genérica)', () => {
    it('acepta 5-20 caracteres alfanuméricos para un tipo distinto de CC/NIT', () => {
      expect(validator(buildForm('ce-id', 'AB12345'))).toBeNull();
    });

    it('rechaza menos de 5 o más de 20 caracteres, o símbolos', () => {
      expect(validator(buildForm('ce-id', 'AB1'))).toEqual(
        expect.objectContaining({ invalidIdentification: expect.any(String) }),
      );
      expect(validator(buildForm('ce-id', 'A'.repeat(21)))).toEqual(
        expect.objectContaining({ invalidIdentification: expect.any(String) }),
      );
      expect(validator(buildForm('ce-id', 'AB-123'))).toEqual(
        expect.objectContaining({ invalidIdentification: expect.any(String) }),
      );
    });

    it('aplica la validación genérica también cuando el documentTypeId no resuelve a ningún catálogo cargado', () => {
      expect(validator(buildForm('id-desconocido', 'AB12345'))).toBeNull();
      expect(validator(buildForm('id-desconocido', 'AB'))).toEqual(
        expect.objectContaining({ invalidIdentification: expect.any(String) }),
      );
    });
  });
});
