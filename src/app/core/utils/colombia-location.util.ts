import { COLOMBIA_DEPARTMENTS, ColombiaDepartment } from '../data/colombia-divipola';

const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalizeLocationText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-z0-9]/g, '');
}

const BOGOTA_ALIASES = new Set(['bogota', 'bogotadc', 'distritocapital']);
const SAN_ANDRES_ALIASES = new Set(['sanandres', 'sanandresyprovidencia']);

export function findDepartment(name?: string | null): ColombiaDepartment | null {
  const key = normalizeLocationText(name ?? '');
  if (!key) {
    return null;
  }
  const alias = BOGOTA_ALIASES.has(key) ? '11' : SAN_ANDRES_ALIASES.has(key) ? '88' : null;
  return (
    COLOMBIA_DEPARTMENTS.find(
      (department) => department.code === alias || normalizeLocationText(department.name) === key,
    ) ?? null
  );
}

export function findMunicipalityName(department: ColombiaDepartment, name?: string | null): string | null {
  const key = normalizeLocationText(name ?? '');
  if (!key) {
    return null;
  }
  if (department.code === '11' && BOGOTA_ALIASES.has(key)) {
    return department.municipalities[0].name;
  }
  return (
    department.municipalities.find((municipality) => normalizeLocationText(municipality.name) === key)?.name ?? null
  );
}

function findUniqueDepartmentOfMunicipality(name?: string | null): ColombiaDepartment | null {
  if (!normalizeLocationText(name ?? '')) {
    return null;
  }
  const matches = COLOMBIA_DEPARTMENTS.filter((department) => findMunicipalityName(department, name) !== null);
  return matches.length === 1 ? matches[0] : null;
}

export interface ResolvedLocation {
  /** Nombre oficial del departamento, o '' si el valor guardado no está en el listado. */
  department: string;
  /** Nombre oficial del municipio, o '' si el valor guardado no está en el listado. */
  city: string;
}

/**
 * Empareja lo que hay guardado (texto libre de antes de las listas) con el
 * listado oficial: ignora tildes y mayúsculas y, si falta el departamento,
 * lo deduce cuando la ciudad existe en uno solo. Lo que no se pueda emparejar
 * queda vacío para que el usuario lo elija.
 */
export function resolveLocation(department?: string | null, city?: string | null): ResolvedLocation {
  const resolvedDepartment = findDepartment(department) ?? findUniqueDepartmentOfMunicipality(city);
  if (!resolvedDepartment) {
    return { department: '', city: '' };
  }
  return {
    department: resolvedDepartment.name,
    city: findMunicipalityName(resolvedDepartment, city) ?? '',
  };
}

export function municipalitiesOf(departmentName?: string | null): readonly string[] {
  return findDepartment(departmentName)?.municipalities.map((municipality) => municipality.name) ?? [];
}

export function departmentNames(): readonly string[] {
  return COLOMBIA_DEPARTMENTS.map((department) => department.name);
}

/**
 * Régimen guardado como texto libre (antes de la lista cerrada) → código de
 * la lista; '' si no se puede interpretar con seguridad.
 */
export function resolveTaxRegime(value?: string | null): string {
  const key = normalizeLocationText(value ?? '');
  if (key === 'vatresponsible' || key === 'vatnotresponsible') {
    return key === 'vatresponsible' ? 'VAT_RESPONSIBLE' : 'VAT_NOT_RESPONSIBLE';
  }
  if (key.includes('noresponsable') || key.includes('simplificado')) {
    return 'VAT_NOT_RESPONSIBLE';
  }
  if (key.includes('responsable') || key.includes('comun')) {
    return 'VAT_RESPONSIBLE';
  }
  return '';
}
