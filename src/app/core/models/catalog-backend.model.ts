/**
 * Backend Catalog DTOs and Interfaces (F25 — catálogos configurables por tenant)
 */

export type CatalogType = 'document_type' | 'risk_level' | 'process_stage' | 'advisor_specialty';

export interface CatalogItem {
  id: string;
  catalogType: CatalogType;
  code: string;
  label: string;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
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
}

export interface UpdateCatalogItemRequest {
  label?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CatalogItemsResponse {
  message: string;
  items: CatalogItem[];
}

export interface CatalogItemResponse {
  message: string;
  item: CatalogItem;
}
