import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CatalogItem,
  CatalogItemResponse,
  CatalogItemsResponse,
  CatalogType,
  CreateCatalogItemRequest,
  UpdateCatalogItemRequest,
} from '../models/catalog-backend.model';

// BUG-20 ola 2: lee error.message — no error.error?.message — ver el
// comentario en deadlines.service.ts.
@Injectable({ providedIn: 'root' })
export class CatalogsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/catalogs`;

  private readonly cache = new Map<CatalogType, Observable<CatalogItem[]>>();

  /**
   * Obtiene los ítems de un catálogo para la empresa actual.
   * Se cachea en memoria por tipo (se invalida al crear/editar/eliminar).
   */
  getCatalog(type: CatalogType): Observable<CatalogItem[]> {
    const cached = this.cache.get(type);
    if (cached) {
      return cached;
    }

    const request$ = this.http.get<CatalogItemsResponse>(`${this.apiUrl}/${type}`).pipe(
      map((response) => response.items),
      catchError((error) => {
        this.cache.delete(type);
        console.error(`Error al obtener catálogo ${type}:`, error);
        return throwError(() => new Error(error.message || 'Error al cargar catálogo'));
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.cache.set(type, request$);
    return request$;
  }

  /** Devuelve solo los ítems activos, ordenados por sortOrder. */
  getActiveCatalog(type: CatalogType): Observable<CatalogItem[]> {
    return this.getCatalog(type).pipe(
      map((items) => items.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder))
    );
  }

  createItem(type: CatalogType, data: CreateCatalogItemRequest): Observable<CatalogItem> {
    return this.http.post<CatalogItemResponse>(`${this.apiUrl}/${type}`, data).pipe(
      map((response) => response.item),
      tap(() => this.invalidate(type)),
      catchError((error) => {
        console.error('Error al crear ítem de catálogo:', error);
        return throwError(() => new Error(error.message || 'Error al crear ítem de catálogo'));
      })
    );
  }

  updateItem(type: CatalogType, id: string, data: UpdateCatalogItemRequest): Observable<CatalogItem> {
    return this.http.patch<CatalogItemResponse>(`${this.apiUrl}/items/${id}`, data).pipe(
      map((response) => response.item),
      tap(() => this.invalidate(type)),
      catchError((error) => {
        console.error('Error al actualizar ítem de catálogo:', error);
        return throwError(() => new Error(error.message || 'Error al actualizar ítem de catálogo'));
      })
    );
  }

  deleteItem(type: CatalogType, id: string): Observable<void> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/items/${id}`).pipe(
      map(() => undefined),
      tap(() => this.invalidate(type)),
      catchError((error) => {
        console.error('Error al eliminar ítem de catálogo:', error);
        return throwError(() => new Error(error.message || 'Error al eliminar ítem de catálogo'));
      })
    );
  }

  /** Limpia el caché de un tipo de catálogo (p. ej. tras crear/editar/eliminar). */
  invalidate(type: CatalogType): void {
    this.cache.delete(type);
  }

  /** Limpia todo el caché (p. ej. al cambiar de tenant en login/logout). */
  invalidateAll(): void {
    this.cache.clear();
  }
}
