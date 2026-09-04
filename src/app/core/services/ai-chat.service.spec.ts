import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AiChatService } from './ai-chat.service';
import { AiChatHistory, AiChatMessage, AiChatResponse } from '../models/ai-chat.model';
import { environment } from '../../../environments/environment';

import { errorInterceptor } from '../interceptors/error.interceptor';
import { PlanUpgradeService } from './plan-upgrade.service';

describe('AiChatService', () => {
  let service: AiChatService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/ai`;

  const assistantMessage: AiChatMessage = {
    id: 'msg-2',
    role: 'assistant',
    content: 'Tienes 3 procesos activos.',
    intentId: 'procesos_activos',
    understood: true,
    feedback: null,
    links: [{ label: 'Proceso 1', path: '/procesos?openId=p1' }],
    createdAt: '2026-09-03T09:00:00Z',
  };

  const userMessage: AiChatMessage = {
    id: 'msg-1',
    role: 'user',
    content: '¿Cuántos procesos activos tengo?',
    intentId: null,
    understood: true,
    feedback: null,
    links: [],
    createdAt: '2026-09-03T09:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PlanUpgradeService, useValue: { isPlanGateError: () => false, promptUpgrade: () => {} } },
      ],
    });

    service = TestBed.inject(AiChatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getHistory hace GET a /ai/chat y devuelve el historial', () => {
    let result: AiChatHistory | undefined;
    service.getHistory().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/chat`);
    expect(req.request.method).toBe('GET');
    req.flush({ conversationId: 'conv-1', messages: [userMessage, assistantMessage] });

    expect(result?.conversationId).toBe('conv-1');
    expect(result?.messages).toEqual([userMessage, assistantMessage]);
  });

  it('getHistory en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getHistory().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/chat`).flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });

    expect(error?.message).toBe('No autorizado');
  });

  it('sendMessage hace POST a /ai/chat con el mensaje y el conversationId', () => {
    let result: AiChatResponse | undefined;
    service.sendMessage('¿Cuántos procesos activos tengo?', 'conv-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/chat`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      message: '¿Cuántos procesos activos tengo?',
      conversationId: 'conv-1',
    });
    req.flush({ conversationId: 'conv-1', userMessage, assistantMessage });

    expect(result?.assistantMessage).toEqual(assistantMessage);
  });

  it('sendMessage sin conversationId lo envía como undefined', () => {
    service.sendMessage('¿qué puedes hacer?').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/chat`);
    expect(req.request.body.conversationId).toBeUndefined();
    req.flush({ conversationId: 'conv-1', userMessage, assistantMessage });
  });

  it('sendMessage en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.sendMessage('hola').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/chat`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  it('setFeedback hace PATCH a /ai/messages/:id/feedback', () => {
    let completed = false;
    service.setFeedback('msg-2', 'up').subscribe(() => (completed = true));

    const req = httpMock.expectOne(`${apiUrl}/messages/msg-2/feedback`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ feedback: 'up' });
    // Angular's HttpTestingController no soporta flush(undefined) — lanza
    // "Automatic conversion to JSON is not supported for response type."
    // porque typeof undefined no matchea ningún caso de _toJsonBody. Un
    // 204/No Content real se simula con null, no con undefined.
    req.flush(null);

    expect(completed).toBe(true);
  });

  it('setFeedback en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.setFeedback('msg-2', 'down').subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(`${apiUrl}/messages/msg-2/feedback`)
      .flush({ message: 'Mensaje no encontrado' }, { status: 404, statusText: 'Not Found' });

    expect(error?.message).toBe('Mensaje no encontrado');
  });
});
