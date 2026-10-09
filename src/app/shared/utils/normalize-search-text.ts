const COMBINING_MARKS = /[̀-ͯ]/g;

/** Minúsculas y sin tildes, para búsquedas que no distingan acentos ni mayúsculas. */
export function normalizeSearchText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '').trim();
}
