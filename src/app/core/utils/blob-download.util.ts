import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 100);
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Con `responseType: 'blob'` Angular entrega también el cuerpo de un error
 * como Blob; se relee como JSON para recuperar el `message` real de la API.
 */
export function readBlobErrorMessage(err: HttpErrorResponse, fallback: string): Observable<never> {
  if (!(err.error instanceof Blob)) {
    return throwError(() => err);
  }
  const body = err.error;
  return new Observable<never>((subscriber) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { message?: string };
        subscriber.error(new Error(parsed.message ?? fallback));
      } catch {
        subscriber.error(new Error(fallback));
      }
    };
    reader.onerror = () => {
      subscriber.error(new Error(fallback));
    };
    reader.readAsText(body);
  });
}
