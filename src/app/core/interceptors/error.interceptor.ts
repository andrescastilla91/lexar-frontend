import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { PlanUpgradeService } from '../services/plan-upgrade.service';

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

/**
 * F7-R3: un gate de plan (403 `FEATURE_NOT_IN_PLAN`, 400 `LIMIT_REACHED`)
 * siempre trae su propio mensaje de negocio real desde el backend — nunca
 * el genérico de `GENERIC_MESSAGE_BY_STATUS` (eso es BUG-19, que sigue sin
 * resolver para el resto de los 403; esta es una excepción puntual, no el
 * fix general).
 */
function buildErrorMessage(error: HttpErrorResponse, isPlanGate: boolean): string {
  if (error.error instanceof ErrorEvent) {
    return `Error: ${error.error.message}`;
  }

  if (!isPlanGate && error.status in GENERIC_MESSAGE_BY_STATUS) {
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
  const planUpgrade = inject(PlanUpgradeService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return throwError(() => error);
      }

      // F7-R3: centralizado aquí en vez de en cada componente — cualquier
      // gate de plan, presente o futuro, dispara el toast+CTA de upgrade
      // sin que cada pantalla que llame el endpoint tenga que acordarse de
      // conectarlo (ver componentes gateados: siguen leyendo
      // `isPlanGateError` solo para su propia limpieza local — cerrar un
      // modal, revertir un checkbox — nunca para mostrar el mensaje).
      const isPlanGate = planUpgrade.isPlanGateError(error);
      if (isPlanGate) {
        planUpgrade.promptUpgrade(error);
      }

      const message = buildErrorMessage(error, isPlanGate);

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
