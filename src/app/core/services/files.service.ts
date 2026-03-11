import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from, switchMap, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  FileModel,
  GenerateSignedUrlRequest,
  SignedUrlResponse,
  RegisterFileRequest,
  DownloadUrlResponse,
  ListFilesParams,
  ListFilesResponse,
  FileUploadProgress,
} from '../models/file.model';

@Injectable({
  providedIn: 'root',
})
export class FilesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/files`;

  // Signal para tracking de uploads activos
  readonly activeUploads = signal<Map<string, FileUploadProgress>>(new Map());

  // Subject para notificar cuando se elimine un archivo
  private readonly fileDeletedSubject = new Subject<string>();
  readonly fileDeleted$ = this.fileDeletedSubject.asObservable();

  /**
   * HU-18: Genera una URL firmada para subir un archivo
   */
  generateSignedUrl(request: GenerateSignedUrlRequest): Observable<SignedUrlResponse> {
    return this.http.post<SignedUrlResponse>(`${this.apiUrl}/signed-url`, request);
  }

  /**
   * HU-19: Registra la metadata del archivo después de subirlo
   */
  registerFile(request: RegisterFileRequest): Observable<FileModel> {
    return this.http.post<FileModel>(this.apiUrl, request);
  }

  /**
   * Lista archivos con filtros opcionales
   */
  listFiles(params: ListFilesParams = {}): Observable<ListFilesResponse> {
    let httpParams = new HttpParams();
    
    if (params.entityType) {
      httpParams = httpParams.set('entityType', params.entityType);
    }
    if (params.entityId) {
      httpParams = httpParams.set('entityId', params.entityId);
    }
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<ListFilesResponse>(this.apiUrl, { params: httpParams });
  }

  /**
   * HU-20: Obtiene archivos por entidad (relación polimórfica)
   */
  getFilesByEntity(entityType: string, entityId: string): Observable<FileModel[]> {
    return this.http.get<FileModel[]>(`${this.apiUrl}/entity/${entityType}/${entityId}`);
  }

  /**
   * Obtiene un archivo por ID
   */
  getFile(id: string): Observable<FileModel> {
    return this.http.get<FileModel>(`${this.apiUrl}/${id}`);
  }

  /**
   * Genera URL firmada para descargar un archivo
   */
  getDownloadUrl(id: string): Observable<DownloadUrlResponse> {
    return this.http.get<DownloadUrlResponse>(`${this.apiUrl}/${id}/download`);
  }

  /**
   * Elimina un archivo
   */
  deleteFile(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Notificar que se eliminó el archivo
        this.fileDeletedSubject.next(id);
      })
    );
  }

  /**
   * Flujo completo: Sube un archivo directamente a S3 y registra la metadata
   */
  uploadFile(
    file: File,
    entityType: string,
    entityId: string,
    metadata?: Record<string, any>,
    annotationEventId?: string,
  ): Observable<FileModel> {
    const uploadId = `${Date.now()}-${file.name}`;
    
    // Inicializar tracking
    this.updateUploadProgress(uploadId, {
      file,
      progress: 0,
      status: 'pending',
    });

    // 1. Obtener URL firmada
    const request: GenerateSignedUrlRequest = {
      filename: file.name,
      contentType: file.type,
      size: file.size,
      entityType,
      entityId,
      metadata,
    };

    return this.generateSignedUrl(request).pipe(
      switchMap((signedUrlResponse) => {
        // 2. Subir archivo a S3
        this.updateUploadProgress(uploadId, { status: 'uploading', progress: 10 });

        return from(
          fetch(signedUrlResponse.url, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type,
            },
            body: file,
          }),
        ).pipe(
          switchMap((response) => {
            if (!response.ok) {
              throw new Error(`Upload failed: ${response.statusText}`);
            }

            this.updateUploadProgress(uploadId, { progress: 90 });

            // 3. Registrar metadata en backend
            const registerRequest: RegisterFileRequest = {
              key: signedUrlResponse.key,
              bucket: signedUrlResponse.bucket,
              originalFilename: file.name,
              contentType: file.type,
              size: file.size,
              entityType,
              entityId,
              metadata,
              annotationEventId, // Pasar el ID de anotación si existe
            };

            return this.registerFile(registerRequest);
          }),
          map((fileModel) => {
            // Marcar como completado
            this.updateUploadProgress(uploadId, {
              status: 'completed',
              progress: 100,
              result: fileModel,
            });

            // Limpiar después de 2 segundos
            setTimeout(() => {
              const uploads = this.activeUploads();
              uploads.delete(uploadId);
              this.activeUploads.set(new Map(uploads));
            }, 2000);

            return fileModel;
          }),
        );
      }),
    );
  }

  /**
   * Descarga un archivo abriendo la URL firmada
   */
  downloadFile(id: string): Observable<void> {
    return this.getDownloadUrl(id).pipe(
      map((response) => {
        // Crear un enlace temporal y hacer click
        const link = document.createElement('a');
        link.href = response.url;
        link.download = response.filename;
        link.target = '_blank';
        link.style.display = 'none';
        
        // Agregar al DOM, hacer click y remover
        document.body.appendChild(link);
        link.click();
        
        // Remover después de un pequeño delay
        setTimeout(() => {
          link.remove();
        }, 100);
      }),
    );
  }

  /**
   * Abre un archivo en una nueva ventana para previsualización
   * (Podría usarse en un modal en lugar de nueva ventana)
   */
  previewFile(id: string): Observable<string> {
    return this.getDownloadUrl(id).pipe(
      map((response) => response.url),
    );
  }

  /**
   * Actualiza el progreso de un upload
   */
  private updateUploadProgress(uploadId: string, update: Partial<FileUploadProgress>): void {
    const uploads = this.activeUploads();
    const current = uploads.get(uploadId);
    
    uploads.set(uploadId, {
      ...current,
      ...update,
    } as FileUploadProgress);
    
    this.activeUploads.set(new Map(uploads));
  }

  /**
   * Obtiene extensión de archivo desde el nombre
   */
  getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Obtiene ícono según tipo de archivo
   */
  getFileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return '🖼️';
    if (contentType === 'application/pdf') return '📄';
    if (contentType.startsWith('video/')) return '🎥';
    if (contentType.startsWith('audio/')) return '🎵';
    if (contentType.includes('word')) return '📝';
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊';
    if (contentType.includes('powerpoint') || contentType.includes('presentation')) return '📽️';
    if (contentType.includes('zip') || contentType.includes('rar')) return '📦';
    return '📎';
  }

  /**
   * Formatea el tamaño del archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
