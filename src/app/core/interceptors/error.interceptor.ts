import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // ⚠️ IMPORTANTE: NO manejar errores 401 aquí
      // El authInterceptor se encarga del refresh de tokens
      if (error.status === 401) {
        return throwError(() => error);
      }

      let errorMessage = 'Ha ocurrido un error inesperado';

      if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Error del lado del servidor
        if (error.error?.message) {
          if (Array.isArray(error.error.message)) {
            errorMessage = error.error.message.join(', ');
          } else {
            errorMessage = error.error.message;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Mensajes específicos por código de estado
        switch (error.status) {
          case 400:
            errorMessage = error.error?.message || 'Solicitud inválida';
            break;
          case 403:
            errorMessage = 'No tienes permisos para realizar esta acción';
            break;
          case 404:
            errorMessage = 'Recurso no encontrado';
            break;
          case 409:
            errorMessage = error.error?.message || 'Conflicto con el recurso';
            break;
          case 500:
            errorMessage = 'Error interno del servidor';
            break;
        }
      }

      console.error('HTTP Error:', {
        status: error.status,
        message: errorMessage,
        url: error.url,
        error: error.error,
      });

      return throwError(() => ({
        message: errorMessage,
        statusCode: error.status,
        error: error.error,
      }));
    })
  );
};
