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

// BUG-19: antes, TODO 403 devolvía el genérico de GENERIC_MESSAGE_BY_STATUS
// sin mirar el mensaje real del backend (p. ej. "Tu suscripción está
// suspendida..." se pisaba por "No tienes permisos para realizar esta
// acción"). Se audita cada status por separado en vez de invertir la
// prioridad a ciegas para los tres códigos del mapa — 403/404/500 no tienen
// el mismo nivel de confianza:
const CANNOT_METHOD_PREFIX = /^Cannot [A-Z]+ /;

/**
 * Prioriza el mensaje real del backend sobre el genérico, pero solo donde es
 * seguro hacerlo:
 * - 500: nunca hay un `throw` deliberado de 500 en `lexar-backend` (grep
 *   confirmado, BUG-19 2026-08-31) — todo 500 es el "Internal server error"
 *   por defecto de Nest ante una excepción no controlada, en inglés y sin
 *   valor para el usuario. Siempre el genérico en español, a propósito.
 * - 404: Nest genera su propio 404 con `Cannot GET /api/...` (en inglés,
 *   expone la ruta interna) cuando ninguna ruta matchea — eso NO es un
 *   `NotFoundException('Usuario no encontrado')` deliberado de nuestro
 *   código (esos sí tienen mensaje real en español y se muestran). Se
 *   descarta por el prefijo característico de Express/Nest.
 * - 403/400/409 y el resto: el backend audita sus propios throws con
 *   mensajes ya pensados para el usuario (`PermissionsGuard`,
 *   `FeatureGuard`, `SubscriptionStatusInterceptor`, gates de plan F7-R2,
 *   etc.) — se muestran tal cual.
 */
function buildErrorMessage(error: HttpErrorResponse): string {
  if (error.error instanceof ErrorEvent) {
    return `Error: ${error.error.message}`;
  }

  if (error.status === 500) {
    return GENERIC_MESSAGE_BY_STATUS[500];
  }

  const backendMessage = extractBackendMessage(error.error);
  const isUnmatchedRoute404 = error.status === 404 && !!backendMessage && CANNOT_METHOD_PREFIX.test(backendMessage);

  if (backendMessage && !isUnmatchedRoute404) {
    return backendMessage;
  }

  return (
    GENERIC_MESSAGE_BY_STATUS[error.status] ??
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
      if (planUpgrade.isPlanGateError(error)) {
        planUpgrade.promptUpgrade(error);
      }

      // BUG-19: buildErrorMessage() ya prioriza el mensaje real del backend
      // para 403/400 (donde viven los gates de plan) — no hace falta un
      // parámetro aparte para eso, ver el comentario de la función.
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
