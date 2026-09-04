import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChatbotComponent } from './chatbot.component';
import { AiChatService } from '../../core/services/ai-chat.service';
import { ToastService } from '../../core/services/toast.service';
import { AiChatMessage } from '../../core/models/ai-chat.model';

/**
 * F20.1 — el componente ya no usa `MockDataService`: consume
 * `AiChatService` (`GET/POST /ai/chat`, `PATCH /ai/messages/:id/feedback`).
 * Este spec cubre: carga de historial, guardia de envío, actualización
 * optimista tras responder, feedback 👍/👎 y navegación de links.
 */
describe('ChatbotComponent', () => {
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
  };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };
  let routerMock: { navigateByUrl: jest.Mock };

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

  const assistantMessage: AiChatMessage = {
    id: 'msg-2',
    role: 'assistant',
    content: 'Tienes 3 procesos activos.',
    intentId: 'procesos_activos',
    understood: true,
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
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };
    routerMock = { navigateByUrl: jest.fn() };

    return TestBed.configureTestingModule({
      imports: [ChatbotComponent],
      providers: [
        { provide: AiChatService, useValue: aiChatServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();
  }

  function createComponent() {
    const fixture = TestBed.createComponent(ChatbotComponent);
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
    it('el botón 👍 queda marcado aria-pressed=true cuando feedback es up', async () => {
      await configure('with-messages');
      const fixture = TestBed.createComponent(ChatbotComponent);
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
});
