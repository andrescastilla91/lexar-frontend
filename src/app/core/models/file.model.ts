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
