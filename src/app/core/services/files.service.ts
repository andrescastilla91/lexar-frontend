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
    if (contentType.startsWith('image/')) {
      return 'm2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 18.75V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25v13.5A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z';
    }
    if (contentType === 'application/pdf' || contentType.includes('word')) {
      return 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z';
    }
    if (contentType.startsWith('video/')) {
      return 'm15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z';
    }
    if (contentType.startsWith('audio/')) {
      return 'M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z';
    }
    if (
      contentType.includes('excel') ||
      contentType.includes('spreadsheet') ||
      contentType.includes('powerpoint') ||
      contentType.includes('presentation')
    ) {
      return 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z';
    }
    if (contentType.includes('zip') || contentType.includes('rar')) {
      return 'm20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z';
    }
    return 'm18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13';
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
