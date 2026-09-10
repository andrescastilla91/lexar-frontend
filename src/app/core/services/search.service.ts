import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SearchResultItem } from '../models/search.model';

interface SearchResponse {
  message: string;
  results: SearchResultItem[];
}

// BUG-20 ola 2: lee error.message — no error.error?.message — ver el
// comentario en deadlines.service.ts.
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** F18 — búsqueda global. Exclusivo del área interna (main-layout), nunca desde el portal. */
  search(q: string): Observable<SearchResultItem[]> {
    return this.http
      .get<SearchResponse>(`${this.apiUrl}/search`, { params: { q } })
      .pipe(
        map((response) => response.results),
        catchError((error) => {
          console.error('Error al buscar:', error);
          return throwError(
            () => new Error(error.message || 'Error al buscar'),
          );
        }),
      );
  }
}
