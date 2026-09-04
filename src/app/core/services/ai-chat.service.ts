import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AiChatFeedback, AiChatHistory, AiChatResponse } from '../models/ai-chat.model';

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
