/**
 * Modelo de archivo (frontend)
 */
export interface FileModel {
  id: string;
  entityType: string;
  entityId: string;
  bucket: string;
  key: string;
  originalFilename: string;
  contentType: string;
  size: number;
  formattedSize: string;
  metadata: Record<string, any> | null;
  uploadedBy: {
    id: string;
    email: string;
  };
  isPreviewable: boolean;
  isImage: boolean;
  isPdf: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** F16: toggle "compartir con cliente" en el portal. */
  visibleToClient?: boolean;
  // F37 §DOC-02 (ola 1) — derivados por el backend, nunca se envían al crear.
  clientId?: string | null;
  matterId?: string | null;
  processId?: string | null;
  documentTypeId?: string | null;
}

/**
 * DTO para generar URL firmada
 */
export interface GenerateSignedUrlRequest {
  filename: string;
  contentType: string;
  size: number;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}

/**
 * Respuesta de URL firmada
 */
export interface SignedUrlResponse {
  url: string;
  key: string;
  bucket: string;
  expiresIn: number;
}

/**
 * DTO para registrar archivo después de subir
 */
export interface RegisterFileRequest {
  key: string;
  bucket: string;
  originalFilename: string;
  contentType: string;
  size: number;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  annotationEventId?: string; // ID del evento de anotación para adjuntar el archivo
  /** F37 §DOC-02: obligatorio para entityType 'legal_process'/'client' salvo
   * cuando annotationEventId está presente (evidencia de anotación). */
  documentTypeId?: string;
}

/**
 * Respuesta de URL de descarga
 */
export interface DownloadUrlResponse {
  url: string;
  filename: string;
  contentType: string;
  expiresIn: number;
}

/**
 * Parámetros para listar archivos
 */
export interface ListFilesParams {
  entityType?: string;
  entityId?: string;
  page?: number;
  limit?: number;
  /** F30: filtro "Solo los míos" del menú Documentos — solo tiene efecto
   * real para quien tiene el permiso files.view.all (para el resto, el
   * backend ya limita a lo propio sin importar este flag). */
  onlyMine?: boolean;
}

/**
 * Respuesta paginada de archivos
 */
export interface ListFilesResponse {
  data: FileModel[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Tipos de entidades soportados para relación polimórfica
 */
export enum EntityType {
  LEGAL_PROCESS = 'legal_process',
  CLIENT = 'client',
  DOCUMENT = 'document',
  ANNOTATION = 'annotation',
}

/**
 * Estado de carga de archivo
 */
export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  result?: FileModel;
}


/**
 * F37 §DOC-01 (ola 2) — nivel 0 del explorador: clientes con documentos.
 */
export interface DocumentTreeClientNode {
  id: string;
  label: string;
  documentCount: number;
}

export type DocumentTreeGroupKind = 'matter' | 'process' | 'general';

/**
 * F37 §DOC-01 (ola 2) — nivel 1 del explorador: asuntos/procesos de un
 * cliente, más el bucket "general" (documentos del cliente sin asunto ni
 * proceso).
 */
export interface DocumentTreeGroupNode {
  kind: DocumentTreeGroupKind;
  id: string | null;
  label: string;
  documentCount: number;
}

/**
 * F37 §DOC-01 (ola 2) — nivel 2 del explorador: tipos documentales dentro
 * de un nodo.
 */
export interface DocumentTreeTypeNode {
  documentTypeId: string;
  label: string;
  color: string | null;
  documentCount: number;
}

/**
 * F37 §DOC-06 (ola 4) — una entrada del historial de auditoría de un
 * documento, tal como la ve la ficha del documento. 'source' distingue si
 * la acción la hizo un usuario interno o un cliente vía portal.
 */
export interface FileAuditLogEntry {
  id: string;
  action: string;
  // F43 §5: texto legible ya traducido por el backend (mismo catálogo que
  // alimenta el módulo de auditoría general) — evita mantener una segunda
  // copia de la traducción en el frontend.
  actionLabel: string;
  userEmail: string | null;
  source: 'internal' | 'portal';
  createdAt: Date;
}
