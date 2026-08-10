import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

const GENERIC_MESSAGE_BY_STATUS: Record<number, string> = {
  403: 'No tienes permisos para realizar esta acción',
  404: 'Recurso no encontrado',
  500: 'Error interno del servidor',
};

const FALLBACK_MESSAGE_BY_STATUS: Record<number, string> = {
  400: 'Solicitud inválida',
  409: 'Conflicto con el recurso',
};

const DEFAULT_ERROR_MESSAGE = 'Ha ocurrido un error inesperado';

function extractBackendMessage(body: unknown): string | undefined {
  const message = (body as { message?: string | string[] } | null)?.message;
  return Array.isArray(message) ? message.join(', ') : message;
}

function buildErrorMessage(error: HttpErrorResponse): string {
  if (error.error instanceof ErrorEvent) {
    return `Error: ${error.error.message}`;
  }

  if (error.status in GENERIC_MESSAGE_BY_STATUS) {
    return GENERIC_MESSAGE_BY_STATUS[error.status];
  }

  return (
    extractBackendMessage(error.error) ??
    FALLBACK_MESSAGE_BY_STATUS[error.status] ??
    error.message ??
    DEFAULT_ERROR_MESSAGE
  );
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return throwError(() => error);
      }

      const message = buildErrorMessage(error);

      console.error('HTTP Error:', {
        status: error.status,
        message,
        url: error.url,
        error: error.error,
      });

      return throwError(() => ({
        message,
        statusCode: error.status,
        error: error.error,
      }));
    })
  );
};
