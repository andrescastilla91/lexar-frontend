/**
 * Backend Catalog DTOs and Interfaces (F25 — catálogos configurables por tenant)
 */

export type CatalogType =
  | 'document_type'
  | 'risk_level'
  | 'process_stage'
  | 'advisor_specialty'
  | 'deadline_type'
  | 'laft_risk'
  | 'contract_type'
  | 'process_type'
  | 'contingency';

/** F33 §1: solo relevante para `document_type`. `null` = aplica a ambos. */
export type CatalogPersonTypeScope = 'NATURAL' | 'JURIDICA';

export interface CatalogItem {
  id: string;
  catalogType: CatalogType;
  code: string;
  label: string;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  personTypeScope: CatalogPersonTypeScope | null;
  /**
   * F40 §PRO-03: solo relevante para `process_stage` — a qué `process_type`
   * aplica esta etapa. `null` = aplica a cualquier tipo (o el catálogo no
   * usa segmentación). A diferencia de `personTypeScope` (enum fijo de 2
   * valores), es el id de otro CatalogItem (`process_type`), porque los
   * tipos de proceso son dinámicos por tenant.
   */
  processTypeScope: string | null;
  usageCount?: number;
}

/**
 * Referencia liviana a un CatalogItem, usada en respuestas de entidades
 * consumidoras (Client, LegalProcess, Advisor) en lugar del valor crudo.
 */
export interface CatalogRef {
  id: string;
  code: string;
  label: string;
  color: string | null;
}

export interface CreateCatalogItemRequest {
  code: string;
  label: string;
  color?: string;
  sortOrder?: number;
  /** F40 §PRO-03: solo aplica al crear ítems de `process_stage`. */
  processTypeScope?: string | null;
}

export interface UpdateCatalogItemRequest {
  label?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
  /** F40 §PRO-03: `null` explícito limpia el scope. */
  processTypeScope?: string | null;
}

export interface CatalogItemsResponse {
  message: string;
  items: CatalogItem[];
}

export interface CatalogItemResponse {
  message: string;
  item: CatalogItem;
}
