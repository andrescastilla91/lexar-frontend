const NIT_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** Dígito de verificación del NIT (módulo 11 de la DIAN); null si el número no es válido. */
export function computeNitCheckDigit(nitNumber: string): string | null {
  const digits = nitNumber.replace(/\D/g, '');
  if (digits.length === 0 || digits.length > NIT_WEIGHTS.length) {
    return null;
  }
  let sum = 0;
  for (let index = 0; index < digits.length; index++) {
    sum += Number(digits[digits.length - 1 - index]) * NIT_WEIGHTS[index];
  }
  const remainder = sum % 11;
  return String(remainder > 1 ? 11 - remainder : remainder);
}

/**
 * El NIT puede estar guardado con el dígito pegado (`900123456-1`) o solo el
 * número; devuelve el número sin dígito y el dígito del sufijo si lo trae.
 */
export function splitNit(taxId: string): { number: string; suffixDigit: string | null } {
  const trimmed = (taxId ?? '').trim();
  const suffix = /^(.*?)[-\s](\d)$/.exec(trimmed);
  const base = suffix ? suffix[1] : trimmed;
  return { number: base.replace(/\D/g, ''), suffixDigit: suffix ? suffix[2] : null };
}
