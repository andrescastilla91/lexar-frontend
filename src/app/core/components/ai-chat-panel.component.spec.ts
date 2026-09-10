import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { AiChatPanelComponent } from './ai-chat-panel.component';
import { AiChatService } from '../services/ai-chat.service';
import { ToastService } from '../services/toast.service';
import { PlanUpgradeService } from '../services/plan-upgrade.service';
import { AiChatMessage } from '../models/ai-chat.model';

/**
 * F20.1-b — extraído de `chatbot.component.spec.ts` (F20.1) cuando la
 * lógica de conversación se movió a este componente compartido para
 * reutilizarla entre la pantalla `/chatbot` y el widget flotante global.
 * Cubre: carga de historial, guardia de envío, actualización optimista
 * tras responder, feedback (útil/no útil) y navegación de links.
 */
describe('AiChatPanelComponent', () => {
  // jsdom no implementa scrollIntoView; el componente lo llama tras cargar
  // el historial y tras cada mensaje nuevo (autoscroll), así que se stubea
  // para todo el archivo, no solo para el describe que lo asserta.
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  let aiChatServiceMock: {
    getHistory: jest.Mock;
    sendMessage: jest.Mock;
    setFeedback: jest.Mock;
    streamSynthesis: jest.Mock;
  };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };
  let routerMock: { navigateByUrl: jest.Mock };
  let planUpgradeServiceMock: { promptUpgrade: jest.Mock };

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
    createdAt: '2026-09-03T09:00:01Z',
  };

  function configure(historyResult: 'empty' | 'with-messages' | 'error' = 'empty') {
    aiChatServiceMock = {
      getHistory: jest.fn().mockReturnValue(
        historyResult === 'error'
          ? throwError(() => new Error('fallo'))
          : of({
              conversationId: historyResult === 'with-messages' ? 'conv-1' : null,
              messages: historyResult === 'with-messages' ? [userMessage, assistantMessage] : [],
            })
      ),
      sendMessage: jest.fn(),
      setFeedback: jest.fn(),
      // F20.3 — ninguna prueba fuera del describe dedicado dispara
      // synthesizing:true, así que por defecto un Subject nunca emitido
      // basta (si algún test lo llamara sin querer, no rompe nada, solo
      // queda una suscripción viva sin efecto).
      streamSynthesis: jest.fn().mockReturnValue(new Subject().asObservable()),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };
    routerMock = { navigateByUrl: jest.fn() };
    planUpgradeServiceMock = { promptUpgrade: jest.fn() };

    return TestBed.configureTestingModule({
      imports: [AiChatPanelComponent],
      providers: [
        { provide: AiChatService, useValue: aiChatServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: PlanUpgradeService, useValue: planUpgradeServiceMock },
      ],
    }).compileComponents();
  }

  function createComponent() {
    const fixture = TestBed.createComponent(AiChatPanelComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('al iniciar, carga el historial desde AiChatService', async () => {
    await configure('with-messages');
    const component = createComponent();

    expect(aiChatServiceMock.getHistory).toHaveBeenCalledTimes(1);
    expect(component.messages()).toEqual([userMessage, assistantMessage]);
    expect(component.isLoadingHistory()).toBe(false);
  });

  it('si el historial falla, no bloquea el componente (conversación nueva)', async () => {
    await configure('error');
    const component = createComponent();

    expect(component.messages()).toEqual([]);
    expect(component.isLoadingHistory()).toBe(false);
  });

  it('usePrompt coloca la sugerencia en el textarea del formulario', async () => {
    await configure();
    const component = createComponent();

    component.usePrompt('¿Qué plazos están por vencer?');

    expect(component.messageForm.value.message).toBe('¿Qué plazos están por vencer?');
  });

  it('sendMessage con formulario inválido, no hace nada', async () => {
    await configure();
    const component = createComponent();
    component.messageForm.patchValue({ message: 'hi' }); // menor a 3 caracteres

    component.sendMessage();

    expect(aiChatServiceMock.sendMessage).not.toHaveBeenCalled();
  });

  it('sendMessage mientras ya hay un envío en curso, no hace nada', async () => {
    await configure();
    const component = createComponent();
    component.messageForm.patchValue({ message: 'Mensaje válido' });
    component.isSending.set(true);

    component.sendMessage();

    expect(aiChatServiceMock.sendMessage).not.toHaveBeenCalled();
  });

  it('sendMessage exitoso agrega el mensaje del usuario y la respuesta del asistente', async () => {
    await configure();
    aiChatServiceMock.sendMessage.mockReturnValue(
      of({ conversationId: 'conv-1', userMessage, assistantMessage })
    );
    const component = createComponent();
    component.messageForm.setValue({ message: '¿Cuántos procesos activos tengo?' });

    component.sendMessage();

    expect(aiChatServiceMock.sendMessage).toHaveBeenCalledWith('¿Cuántos procesos activos tengo?', undefined);
    expect(component.messages()).toEqual([userMessage, assistantMessage]);
    expect(component.messageForm.value.message).toBe('');
    expect(component.isSending()).toBe(false);
  });

  it('F7-R4: sendMessage con quotaExhausted=true dispara el CTA de upgrade (PlanUpgradeService)', async () => {
    await configure();
    const quotaExhaustedMessage: AiChatMessage = {
      ...assistantMessage,
      id: 'msg-3',
      content: 'Se agotó el cupo de respuestas avanzadas de tu plan para este mes.',
      understood: false,
      quotaExhausted: true,
    };
    aiChatServiceMock.sendMessage.mockReturnValue(
      of({ conversationId: 'conv-1', userMessage, assistantMessage: quotaExhaustedMessage })
    );
    const component = createComponent();
    component.messageForm.setValue({ message: 'cuéntame un chiste' });

    component.sendMessage();

    expect(planUpgradeServiceMock.promptUpgrade).toHaveBeenCalledWith({
      error: {
        message: quotaExhaustedMessage.content,
        code: 'LIMIT_REACHED',
        limit: 'aiCreditsMonth',
      },
    });
  });

  it('sendMessage con quotaExhausted=false NO dispara el CTA de upgrade', async () => {
    await configure();
    aiChatServiceMock.sendMessage.mockReturnValue(
      of({ conversationId: 'conv-1', userMessage, assistantMessage })
    );
    const component = createComponent();
    component.messageForm.setValue({ message: '¿Cuántos procesos activos tengo?' });

    component.sendMessage();

    expect(planUpgradeServiceMock.promptUpgrade).not.toHaveBeenCalled();
  });

  it('sendMessage con error, muestra el mensaje y no limpia el formulario', async () => {
    await configure();
    aiChatServiceMock.sendMessage.mockReturnValue(throwError(() => new Error('Error de red')));
    const component = createComponent();
    component.messageForm.setValue({ message: '¿Cuántos procesos activos tengo?' });

    component.sendMessage();

    expect(component.error()).toBe('Error de red');
    expect(component.isSending()).toBe(false);
    expect(component.messageForm.value.message).toBe('¿Cuántos procesos activos tengo?');
  });

  describe('BUG-IA-3 (2026-09-07): mensaje optimista y burbuja "escribiendo"', () => {
    it('agrega el mensaje optimista y limpia el textarea de inmediato, antes de que la respuesta llegue', async () => {
      await configure();
      const responseSubject = new Subject<{
        conversationId: string;
        userMessage: AiChatMessage;
        assistantMessage: AiChatMessage;
      }>();
      aiChatServiceMock.sendMessage.mockReturnValue(responseSubject.asObservable());
      const component = createComponent();
      component.messageForm.setValue({ message: '¿Cuántos procesos activos tengo?' });

      component.sendMessage();

      // Estado intermedio: la respuesta real aún no llegó.
      expect(component.isSending()).toBe(true);
      expect(component.messageForm.value.message).toBe('');
      const optimisticMessages = component.messages().filter((m) => m.role === 'user');
      expect(optimisticMessages).toHaveLength(1);
      expect(optimisticMessages[0].content).toBe('¿Cuántos procesos activos tengo?');
      expect(optimisticMessages[0].id).toMatch(/^optimistic-/);

      responseSubject.next({ conversationId: 'conv-1', userMessage, assistantMessage });
      responseSubject.complete();

      // Tras la respuesta real, el mensaje optimista se reemplaza — no queda
      // ningún id temporal en el hilo.
      expect(component.messages()).toEqual([userMessage, assistantMessage]);
      expect(component.messages().some((m) => m.id.startsWith('optimistic-'))).toBe(false);
      expect(component.isSending()).toBe(false);
    });

    it('la burbuja "escribiendo" se muestra en el hilo mientras isSending es true y desaparece al resolver', async () => {
      await configure();
      const responseSubject = new Subject<{
        conversationId: string;
        userMessage: AiChatMessage;
        assistantMessage: AiChatMessage;
      }>();
      aiChatServiceMock.sendMessage.mockReturnValue(responseSubject.asObservable());
      const fixture = TestBed.createComponent(AiChatPanelComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component.messageForm.setValue({ message: '¿Cuántos procesos activos tengo?' });

      component.sendMessage();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Escribiendo');

      responseSubject.next({ conversationId: 'conv-1', userMessage, assistantMessage });
      responseSubject.complete();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Escribiendo');
    });

    it('en error, no queda ningún mensaje optimista en el hilo', async () => {
      await configure();
      aiChatServiceMock.sendMessage.mockReturnValue(throwError(() => new Error('Error de red')));
      const component = createComponent();
      component.messageForm.setValue({ message: '¿Cuántos procesos activos tengo?' });

      component.sendMessage();

      expect(component.messages()).toEqual([]);
    });
  });

  it('rate registra el feedback y actualiza el mensaje localmente', async () => {
    await configure('with-messages');
    aiChatServiceMock.setFeedback.mockReturnValue(of(undefined));
    const component = createComponent();

    component.rate(assistantMessage, 'up');

    expect(aiChatServiceMock.setFeedback).toHaveBeenCalledWith('msg-2', 'up');
    expect(component.messages().find((m) => m.id === 'msg-2')?.feedback).toBe('up');
    expect(toastServiceMock.success).toHaveBeenCalled();
  });

  it('rate en error muestra un toast de error y no modifica el mensaje', async () => {
    await configure('with-messages');
    aiChatServiceMock.setFeedback.mockReturnValue(throwError(() => new Error('fallo')));
    const component = createComponent();

    component.rate(assistantMessage, 'down');

    expect(toastServiceMock.error).toHaveBeenCalled();
    expect(component.messages().find((m) => m.id === 'msg-2')?.feedback).toBeNull();
  });

  it('rate ignora mensajes que no son del asistente', async () => {
    await configure('with-messages');
    const component = createComponent();

    component.rate(userMessage, 'up');

    expect(aiChatServiceMock.setFeedback).not.toHaveBeenCalled();
  });

  it('openLink navega a la ruta del link', async () => {
    await configure();
    const component = createComponent();

    component.openLink({ label: 'Proceso 1', path: '/procesos?openId=p1' });

    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/procesos?openId=p1');
  });

  it('parseAnswer delega en parseAiListAnswer (formato de lista del backend)', async () => {
    await configure();
    const component = createComponent();

    expect(component.parseAnswer('Tienes 3 procesos activos.')).toBeNull();
    expect(component.parseAnswer('intro\n\nitem1\nitem2')).toEqual({
      intro: 'intro',
      items: ['item1', 'item2'],
    });
  });

  describe('Enter para enviar (estándar de chat)', () => {
    it('Enter sin Shift previene el salto de línea y envía el mensaje', async () => {
      await configure();
      const component = createComponent();
      const sendSpy = jest.spyOn(component, 'sendMessage').mockImplementation(() => undefined);
      const event = { key: 'Enter', shiftKey: false, preventDefault: jest.fn() } as unknown as KeyboardEvent;

      component.onTextareaKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalled();
    });

    it('Shift+Enter no envía — permite salto de línea', async () => {
      await configure();
      const component = createComponent();
      const sendSpy = jest.spyOn(component, 'sendMessage').mockImplementation(() => undefined);
      const event = { key: 'Enter', shiftKey: true, preventDefault: jest.fn() } as unknown as KeyboardEvent;

      component.onTextareaKeydown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('otras teclas no disparan envío', async () => {
      await configure();
      const component = createComponent();
      const sendSpy = jest.spyOn(component, 'sendMessage').mockImplementation(() => undefined);
      const event = { key: 'a', shiftKey: false, preventDefault: jest.fn() } as unknown as KeyboardEvent;

      component.onTextareaKeydown(event);

      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  describe('autoscroll al final de la conversación', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('al cargar el historial, hace scroll al final', async () => {
      await configure('with-messages');
      createComponent();

      jest.runAllTimers();

      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'end' });
    });

    it('tras enviar un mensaje, hace scroll al final con la respuesta ya renderizada', async () => {
      await configure();
      aiChatServiceMock.sendMessage.mockReturnValue(
        of({ conversationId: 'conv-1', userMessage, assistantMessage })
      );
      const component = createComponent();
      jest.runAllTimers();
      (Element.prototype.scrollIntoView as jest.Mock).mockClear();
      component.messageForm.setValue({ message: '¿Cuántos procesos activos tengo?' });

      component.sendMessage();
      jest.runAllTimers();

      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'end' });
    });
  });

  describe('feedback visualmente distinguible', () => {
    it('el botón "Respuesta útil" queda marcado aria-pressed=true cuando feedback es up', async () => {
      await configure('with-messages');
      const fixture = TestBed.createComponent(AiChatPanelComponent);
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('button[aria-label="Respuesta útil"]');

      expect(buttons.length).toBeGreaterThan(0);
      expect(buttons[0].getAttribute('aria-pressed')).toBe('false');

      fixture.componentInstance.messages.update((current) =>
        current.map((m) => (m.id === 'msg-2' ? { ...m, feedback: 'up' as const } : m))
      );
      fixture.detectChanges();

      expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('F20.3: streaming de la redacción Nivel 2 (Lexi)', () => {
    function synthesizingResponse(overrides: Partial<AiChatMessage> = {}) {
      const synthesizingMessage: AiChatMessage = {
        ...assistantMessage,
        id: 'msg-synth',
        content: '',
        synthesizing: true,
        links: [],
        ...overrides,
      };
      return { conversationId: 'conv-1', userMessage, assistantMessage: synthesizingMessage };
    }

    it('cuando la respuesta llega con synthesizing=true, abre streamSynthesis(id) y el mensaje entra al hilo con content vacío', async () => {
      await configure();
      aiChatServiceMock.sendMessage.mockReturnValue(of(synthesizingResponse()));
      const streamSubject = new Subject<{ delta?: string; done?: boolean }>();
      aiChatServiceMock.streamSynthesis.mockReturnValue(streamSubject.asObservable());
      const component = createComponent();
      component.messageForm.setValue({ message: '¿cómo va el proceso 2026-CV-001?' });

      component.sendMessage();

      expect(aiChatServiceMock.streamSynthesis).toHaveBeenCalledWith('msg-synth');
      expect(component.messages().find((m) => m.id === 'msg-synth')?.content).toBe('');
    });

    it('va acumulando cada delta en el contenido del mensaje, de forma inmutable por id', async () => {
      await configure();
      aiChatServiceMock.sendMessage.mockReturnValue(of(synthesizingResponse()));
      const streamSubject = new Subject<{ delta?: string; done?: boolean }>();
      aiChatServiceMock.streamSynthesis.mockReturnValue(streamSubject.asObservable());
      const component = createComponent();
      component.messageForm.setValue({ message: '¿cómo va el proceso 2026-CV-001?' });
      component.sendMessage();
      const before = component.messages();

      streamSubject.next({ delta: 'El proceso ' });
      streamSubject.next({ delta: 'va en etapa de investigación.' });

      expect(component.messages().find((m) => m.id === 'msg-synth')?.content).toBe(
        'El proceso va en etapa de investigación.'
      );
      // Inmutabilidad: el array de mensajes es una referencia nueva en cada
      // delta (requisito de detección de cambios con signals), no una
      // mutación in-place del array anterior.
      expect(component.messages()).not.toBe(before);
    });

    it('al completar el stream (evento done), recarga el historial para traer el contenido y los links definitivos', async () => {
      await configure();
      aiChatServiceMock.sendMessage.mockReturnValue(of(synthesizingResponse()));
      const streamSubject = new Subject<{ delta?: string; done?: boolean }>();
      aiChatServiceMock.streamSynthesis.mockReturnValue(streamSubject.asObservable());
      const component = createComponent();
      aiChatServiceMock.getHistory.mockClear(); // descarta la llamada de ngOnInit
      component.messageForm.setValue({ message: '¿cómo va el proceso 2026-CV-001?' });
      component.sendMessage();

      streamSubject.next({ delta: 'texto final' });
      streamSubject.next({ done: true });
      streamSubject.complete();

      expect(aiChatServiceMock.getHistory).toHaveBeenCalledTimes(1);
    });

    it('si el stream se corta por un error de conexión (complete sin done previo), igual recarga el historial — no deja el indicador colgado', async () => {
      await configure();
      aiChatServiceMock.sendMessage.mockReturnValue(of(synthesizingResponse()));
      const streamSubject = new Subject<{ delta?: string; done?: boolean }>();
      aiChatServiceMock.streamSynthesis.mockReturnValue(streamSubject.asObservable());
      const component = createComponent();
      aiChatServiceMock.getHistory.mockClear();
      component.messageForm.setValue({ message: '¿cómo va el proceso 2026-CV-001?' });
      component.sendMessage();

      // El servicio degrada un error de EventSource a un `complete()` sin
      // `next({done:true})` previo (ver ai-chat.service.ts) — el componente
      // no distingue ambos casos, siempre recarga el historial al completar.
      streamSubject.complete();

      expect(aiChatServiceMock.getHistory).toHaveBeenCalledTimes(1);
    });

    it('cuando la respuesta NO viene synthesizing, nunca abre el stream', async () => {
      await configure();
      aiChatServiceMock.sendMessage.mockReturnValue(
        of({ conversationId: 'conv-1', userMessage, assistantMessage })
      );
      const component = createComponent();
      component.messageForm.setValue({ message: '¿Cuántos procesos activos tengo?' });

      component.sendMessage();

      expect(aiChatServiceMock.streamSynthesis).not.toHaveBeenCalled();
    });

    it('muestra el indicador "Redactando" mientras synthesizing es true y content vacío, y lo reemplaza cuando llegan deltas', async () => {
      await configure();
      aiChatServiceMock.sendMessage.mockReturnValue(of(synthesizingResponse()));
      const streamSubject = new Subject<{ delta?: string; done?: boolean }>();
      aiChatServiceMock.streamSynthesis.mockReturnValue(streamSubject.asObservable());
      const fixture = TestBed.createComponent(AiChatPanelComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component.messageForm.setValue({ message: '¿cómo va el proceso 2026-CV-001?' });

      component.sendMessage();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Redactando');

      streamSubject.next({ delta: 'El proceso va bien.' });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Redactando');
      expect(fixture.nativeElement.textContent).toContain('El proceso va bien.');
    });

    it('oculta los botones de feedback y los links mientras el mensaje sigue synthesizing', async () => {
      await configure();
      aiChatServiceMock.sendMessage.mockReturnValue(
        of(
          synthesizingResponse({
            links: [{ label: 'Proceso 1', path: '/procesos?openId=p1' }],
          })
        )
      );
      aiChatServiceMock.streamSynthesis.mockReturnValue(new Subject().asObservable());
      const fixture = TestBed.createComponent(AiChatPanelComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component.messageForm.setValue({ message: '¿cómo va el proceso 2026-CV-001?' });

      component.sendMessage();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('button[aria-label="Respuesta útil"]')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Proceso 1');
    });
  });

  describe('botón de cerrar (uso desde el widget flotante)', () => {
    it('no se renderiza por defecto (pantalla /chatbot)', async () => {
      await configure();
      const fixture = TestBed.createComponent(AiChatPanelComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('button[aria-label="Cerrar asistente"]')).toBeNull();
    });

    it('con showCloseButton=true, emite closeRequested al hacer click', async () => {
      await configure();
      const fixture = TestBed.createComponent(AiChatPanelComponent);
      fixture.componentInstance.showCloseButton = true;
      fixture.detectChanges();

      const closeSpy = jest.fn();
      fixture.componentInstance.closeRequested.subscribe(closeSpy);

      const closeButton: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[aria-label="Cerrar asistente"]'
      );
      expect(closeButton).not.toBeNull();
      closeButton.click();

      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
