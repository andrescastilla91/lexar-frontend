import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AiChatService } from './ai-chat.service';
import {
  AiChatHistory,
  AiChatMessage,
  AiChatResponse,
  AiSynthesisStreamEvent,
} from '../models/ai-chat.model';
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
    quotaExhausted: false,
    synthesizing: false,
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
    quotaExhausted: false,
    synthesizing: false,
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

  it('getUsage hace GET a /ai/usage y devuelve el resumen de consumo', () => {
    const backendResponse = {
      used: 7,
      limit: 20,
      periodStart: '2026-09-01',
      periodEnd: '2026-10-01',
    };
    let result: typeof backendResponse | undefined;
    service.getUsage().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/usage`);
    expect(req.request.method).toBe('GET');
    req.flush(backendResponse);

    expect(result).toEqual(backendResponse);
  });

  it('getUsage en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getUsage().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/usage`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  describe('streamSynthesis (F20.3 — streaming SSE de la redacción Nivel 2)', () => {
    // Mismo patrón que NotificationsService.spec.ts (F12): un EventSource
    // falso registrado en `global` para no depender de que jsdom lo
    // implemente ni de una conexión real.
    class FakeEventSource {
      static instances: FakeEventSource[] = [];
      onerror: (() => void) | null = null;
      private readonly listeners: Record<string, ((event: MessageEvent<string>) => void)[]> = {};
      closed = false;

      constructor(
        public readonly url: string,
        public readonly options?: { withCredentials?: boolean }
      ) {
        FakeEventSource.instances.push(this);
      }

      addEventListener(type: string, cb: (event: MessageEvent<string>) => void): void {
        this.listeners[type] = this.listeners[type] ?? [];
        this.listeners[type].push(cb);
      }

      close(): void {
        this.closed = true;
      }

      emit(type: string, event: MessageEvent<string>): void {
        (this.listeners[type] ?? []).forEach((cb) => cb(event));
      }
    }

    beforeEach(() => {
      FakeEventSource.instances = [];
      (global as unknown as { EventSource: typeof FakeEventSource }).EventSource = FakeEventSource;
    });

    it('abre un EventSource hacia /ai/messages/:id/stream con credenciales', () => {
      service.streamSynthesis('msg-1').subscribe();

      expect(FakeEventSource.instances).toHaveLength(1);
      expect(FakeEventSource.instances[0].url).toBe(`${apiUrl}/messages/msg-1/stream`);
      expect(FakeEventSource.instances[0].options).toEqual({ withCredentials: true });
    });

    it('un evento "delta" emite { delta } al observable', () => {
      const events: AiSynthesisStreamEvent[] = [];
      service.streamSynthesis('msg-1').subscribe((e) => events.push(e));
      const instance = FakeEventSource.instances[0];

      instance.emit('delta', { data: 'Hola' } as MessageEvent<string>);
      instance.emit('delta', { data: ' mundo' } as MessageEvent<string>);

      expect(events).toEqual([{ delta: 'Hola' }, { delta: ' mundo' }]);
    });

    it('un evento "done" emite { done: true }, completa el observable y cierra el EventSource', () => {
      const events: AiSynthesisStreamEvent[] = [];
      let completed = false;
      service.streamSynthesis('msg-1').subscribe({
        next: (e) => events.push(e),
        complete: () => (completed = true),
      });
      const instance = FakeEventSource.instances[0];

      instance.emit('done', {} as MessageEvent<string>);

      expect(events).toEqual([{ done: true }]);
      expect(completed).toBe(true);
      expect(instance.closed).toBe(true);
    });

    it('un error de conexión completa el observable en silencio (degradación) y cierra el EventSource — nunca propaga error()', () => {
      let completed = false;
      let errored = false;
      service.streamSynthesis('msg-1').subscribe({
        complete: () => (completed = true),
        error: () => (errored = true),
      });
      const instance = FakeEventSource.instances[0];

      instance.onerror?.();

      expect(completed).toBe(true);
      expect(errored).toBe(false);
      expect(instance.closed).toBe(true);
    });

    it('al desuscribirse antes de terminar, cierra el EventSource (teardown)', () => {
      const subscription = service.streamSynthesis('msg-1').subscribe();
      const instance = FakeEventSource.instances[0];

      subscription.unsubscribe();

      expect(instance.closed).toBe(true);
    });
  });
});
