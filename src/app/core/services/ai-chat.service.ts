import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AiChatFeedback,
  AiChatHistory,
  AiChatResponse,
  AiSynthesisStreamEvent,
  AiUsageSummary,
} from '../models/ai-chat.model';

/**
 * F20.1 — cliente del asistente IA Nivel 0 (sin LLM). Sigue el mismo
 * patrón de `search.service.ts`: lee `error.message` (no
 * `error.error?.message`, ver comentario en `deadlines.service.ts` /
 * BUG-20 ola 2) y reenvía un Error de mensaje amigable.
 */
@Injectable({ providedIn: 'root' })
export class AiChatService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getHistory(): Observable<AiChatHistory> {
    return this.http.get<AiChatHistory>(`${this.apiUrl}/ai/chat`).pipe(
      catchError((error) => {
        console.error('Error al obtener el historial del asistente:', error);
        return throwError(() => new Error(error.message || 'Error al obtener el historial'));
      })
    );
  }

  sendMessage(message: string, conversationId?: string): Observable<AiChatResponse> {
    return this.http
      .post<AiChatResponse>(`${this.apiUrl}/ai/chat`, { message, conversationId })
      .pipe(
        catchError((error) => {
          console.error('Error al enviar el mensaje al asistente:', error);
          return throwError(() => new Error(error.message || 'Error al enviar el mensaje'));
        })
      );
  }

  /** F7-R4: consumo del mes vigente del cupo de IA — usado en el resumen de
   * "Plan y facturación". Falla en silencio con un valor "vacío" en el
   * consumidor (ver SettingsPlanComponent) en vez de bloquear la pantalla:
   * es informativo, no crítico. */
  getUsage(): Observable<AiUsageSummary> {
    return this.http.get<AiUsageSummary>(`${this.apiUrl}/ai/usage`).pipe(
      catchError((error) => {
        console.error('Error al obtener el consumo de IA:', error);
        return throwError(() => new Error(error.message || 'Error al obtener el consumo de IA'));
      })
    );
  }

  /** F20.3 — streaming de la redacción Nivel 2 (`GET
   * /ai/messages/:id/stream`, SSE). Envuelto en un `Observable` (a
   * diferencia de `NotificationsService`, que expone un `EventSource`
   * crudo con estado propio vía signals) porque este stream es acotado a
   * UN mensaje y termina solo: el patrón Observable da cierre automático
   * (`complete()` en el evento `done`) y limpieza determinista
   * (`EventSource.close()` en el teardown, tanto al completar como si el
   * componente se desuscribe antes, p. ej. al destruirse) sin que el
   * consumidor tenga que gestionar el ciclo de vida a mano. Los `ping` de
   * heartbeat (mismo patrón que F12) no se reenvían — solo mantienen viva
   * la conexión a través de proxies. */
  streamSynthesis(messageId: string): Observable<AiSynthesisStreamEvent> {
    return new Observable<AiSynthesisStreamEvent>((subscriber) => {
      const eventSource = new EventSource(`${this.apiUrl}/ai/messages/${messageId}/stream`, {
        withCredentials: true,
      });

      eventSource.addEventListener('delta', (event: MessageEvent<string>) => {
        subscriber.next({ delta: event.data });
      });
      eventSource.addEventListener('done', () => {
        subscriber.next({ done: true });
        subscriber.complete();
      });
      eventSource.onerror = () => {
        // Degradación silenciosa (mismo criterio de diseño que el backend):
        // el usuario ya tiene visible lo que alcanzó a llegar, o nada — un
        // error de red en el stream no debe mostrarse como un fallo del
        // asistente, que sigue funcionando por los demás caminos.
        subscriber.complete();
      };

      return () => eventSource.close();
    });
  }

  setFeedback(messageId: string, feedback: AiChatFeedback): Observable<void> {
    return this.http
      .patch<void>(`${this.apiUrl}/ai/messages/${messageId}/feedback`, { feedback })
      .pipe(
        catchError((error) => {
          console.error('Error al registrar el feedback del asistente:', error);
          return throwError(() => new Error(error.message || 'Error al registrar el feedback'));
        })
      );
  }
}
