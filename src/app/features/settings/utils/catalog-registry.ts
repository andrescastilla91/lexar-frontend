import { CatalogSummaryItem, CatalogType } from '../../../core/models/catalog-backend.model';

export type CatalogGroupId = 'clients' | 'processes' | 'agenda' | 'documents' | 'team';

export interface CatalogMeta {
  label: string;
  group: CatalogGroupId;
  /** Qué es el catálogo y dónde se usa: se muestra en el detalle y en el estado vacío. */
  description: string;
}

/**
 * Grupos de la navegación de catálogos, en el orden en que se muestran. La
 * taxonomía vive aquí (UI) y no en el backend: `CatalogType` es un contrato
 * de datos y no debe cargar con cómo se agrupa en pantalla.
 */
export const CATALOG_GROUPS: { id: CatalogGroupId; label: string }[] = [
  { id: 'clients', label: 'Clientes' },
  { id: 'processes', label: 'Procesos' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'documents', label: 'Documentos' },
  { id: 'team', label: 'Equipo' },
];

/**
 * F47: ÚNICA tabla que hay que tocar para que un catálogo nuevo aparezca en la
 * navegación. Al ser un `Record<CatalogType, …>`, agregar un valor a
 * `CatalogType` sin su entrada aquí no compila.
 */
export const CATALOG_META: Record<CatalogType, CatalogMeta> = {
  document_type: {
    label: 'Tipos de documento',
    group: 'clients',
    description:
      'Documentos de identificación de los clientes (cédula, NIT, pasaporte…). Se eligen en el formulario de cliente.',
  },
  risk_level: {
    label: 'Niveles de riesgo',
    group: 'clients',
    description: 'Nivel de criticidad de clientes y procesos. Se usa en sus formularios y en los tableros de riesgo.',
  },
  laft_risk: {
    label: 'Riesgo LA/FT',
    group: 'clients',
    description: 'Clasificación de riesgo de lavado de activos y financiación del terrorismo de cada cliente.',
  },
  contract_type: {
    label: 'Tipos de vinculación',
    group: 'clients',
    description: 'Tipo de vinculación del asunto de un cliente (asesoría, litigio…). Se elige al crear un asunto.',
  },
  process_type: {
    label: 'Tipos de proceso',
    group: 'processes',
    description: 'Tipo de cada proceso legal (judicial, administrativo, consultivo…). Se elige en el formulario de proceso.',
  },
  process_stage: {
    label: 'Etapas de proceso',
    group: 'processes',
    description:
      'Etapas por las que avanza un proceso. Cada etapa puede limitarse a un tipo de proceso o aplicar a todos.',
  },
  contingency: {
    label: 'Contingencia',
    group: 'processes',
    description: 'Contingencia estimada de cada proceso (probable, eventual, remota…).',
  },
  deadline_type: {
    label: 'Tipos de evento',
    group: 'agenda',
    description: 'Tipos de evento del calendario: plazos, audiencias y demás eventos del despacho.',
  },
  case_document_type: {
    label: 'Tipos de documento (archivos)',
    group: 'documents',
    description:
      'Clasificación de los archivos que se cargan a un cliente o proceso (contrato, poder, memorial…). No es el documento de identidad del cliente.',
  },
  advisor_specialty: {
    label: 'Especialidades de asesor',
    group: 'team',
    description: 'Especialidades que se asignan al perfil profesional de los asesores.',
  },
};

export const DEFAULT_CATALOG_TYPE: CatalogType = 'document_type';

export function isCatalogType(value: string | null | undefined): value is CatalogType {
  return !!value && Object.prototype.hasOwnProperty.call(CATALOG_META, value);
}

export interface CatalogNavEntry {
  type: CatalogType;
  label: string;
  /** Ítems activos; `null` mientras el resumen no ha cargado (o si falló). */
  activeCount: number | null;
}

export interface CatalogNavGroup {
  id: CatalogGroupId;
  label: string;
  entries: CatalogNavEntry[];
}

/** Minúsculas y sin tildes: "contingéncia" encuentra "Contingencia". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Arma los grupos de la navegación: filtra por el texto del buscador (nombre
 * del catálogo o de su grupo) y descarta los grupos que quedan vacíos.
 */
export function buildCatalogNav(summary: CatalogSummaryItem[] | null, query = ''): CatalogNavGroup[] {
  const activeByType = new Map(summary?.map((row) => [row.catalogType, row.active]));
  const needle = normalize(query);

  return CATALOG_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    entries: (Object.keys(CATALOG_META) as CatalogType[])
      .filter((type) => CATALOG_META[type].group === group.id)
      .filter(
        (type) =>
          !needle || normalize(CATALOG_META[type].label).includes(needle) || normalize(group.label).includes(needle)
      )
      .map((type) => ({
        type,
        label: CATALOG_META[type].label,
        activeCount: summary ? (activeByType.get(type) ?? 0) : null,
      })),
  })).filter((group) => group.entries.length > 0);
}
