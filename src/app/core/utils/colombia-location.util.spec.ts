import {
  departmentNames,
  findDepartment,
  findMunicipalityName,
  municipalitiesOf,
  resolveLocation,
  resolveTaxRegime,
} from './colombia-location.util';

describe('colombia-location.util', () => {
  it('lista los 33 departamentos', () => {
    expect(departmentNames()).toHaveLength(33);
    expect(departmentNames()).toContain('Bogotá D.C.');
  });

  it('municipalitiesOf devuelve solo los del departamento, ignorando tildes', () => {
    const antioquia = municipalitiesOf('antioquia');
    expect(antioquia).toContain('Medellín');
    expect(antioquia).not.toContain('Cali');
    expect(municipalitiesOf('')).toEqual([]);
    expect(municipalitiesOf('Narnia')).toEqual([]);
  });

  it('Bogotá cuenta como departamento y municipio a la vez', () => {
    expect(findDepartment('Bogotá')?.name).toBe('Bogotá D.C.');
    expect(findMunicipalityName(findDepartment('Bogotá D.C.')!, 'bogota')).toBe('Bogotá D.C.');
  });

  describe('resolveLocation (datos anteriores a las listas)', () => {
    it('normaliza texto libre a los nombres oficiales', () => {
      expect(resolveLocation('cundinamarca', 'zipaquira')).toEqual({
        department: 'Cundinamarca',
        city: 'Zipaquirá',
      });
    });

    it('deduce el departamento cuando la ciudad es única', () => {
      expect(resolveLocation('', 'Medellín')).toEqual({ department: 'Antioquia', city: 'Medellín' });
      expect(resolveLocation(null, 'Bogotá')).toEqual({ department: 'Bogotá D.C.', city: 'Bogotá D.C.' });
    });

    it('un par histórico inconsistente (Bogotá en Cundinamarca) conserva el departamento y deja la ciudad por elegir', () => {
      expect(resolveLocation('Cundinamarca', 'Bogotá')).toEqual({ department: 'Cundinamarca', city: '' });
    });

    it('lo que no se puede emparejar queda vacío', () => {
      expect(resolveLocation('Narnia', 'Cair Paravel')).toEqual({ department: '', city: '' });
      expect(resolveLocation('', 'Santa Rosa')).toEqual({ department: '', city: '' });
      expect(resolveLocation(undefined, undefined)).toEqual({ department: '', city: '' });
    });
  });

  describe('resolveTaxRegime', () => {
    it('conserva los códigos vigentes', () => {
      expect(resolveTaxRegime('VAT_RESPONSIBLE')).toBe('VAT_RESPONSIBLE');
      expect(resolveTaxRegime('VAT_NOT_RESPONSIBLE')).toBe('VAT_NOT_RESPONSIBLE');
    });

    it('interpreta los textos históricos reconocibles', () => {
      expect(resolveTaxRegime('Responsable de IVA')).toBe('VAT_RESPONSIBLE');
      expect(resolveTaxRegime('Régimen común')).toBe('VAT_RESPONSIBLE');
      expect(resolveTaxRegime('No responsable de IVA')).toBe('VAT_NOT_RESPONSIBLE');
      expect(resolveTaxRegime('Régimen simplificado')).toBe('VAT_NOT_RESPONSIBLE');
    });

    it('lo ambiguo o vacío queda sin elegir', () => {
      expect(resolveTaxRegime('Régimen simple')).toBe('');
      expect(resolveTaxRegime('')).toBe('');
      expect(resolveTaxRegime(null)).toBe('');
    });
  });
});
