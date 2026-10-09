import { computeNitCheckDigit, splitNit } from './nit.util';

describe('nit.util', () => {
  it('calcula el dígito de verificación de la DIAN', () => {
    expect(computeNitCheckDigit('890903938')).toBe('8');
    expect(computeNitCheckDigit('890.903.938')).toBe('8');
  });

  it('devuelve null si no hay dígitos o hay más de 15', () => {
    expect(computeNitCheckDigit('')).toBeNull();
    expect(computeNitCheckDigit('1'.repeat(16))).toBeNull();
  });

  it('separa el dígito pegado al NIT', () => {
    expect(splitNit('900123456-1')).toEqual({ number: '900123456', suffixDigit: '1' });
  });

  it('sin sufijo devuelve solo el número', () => {
    expect(splitNit('900.123.456')).toEqual({ number: '900123456', suffixDigit: null });
  });
});
