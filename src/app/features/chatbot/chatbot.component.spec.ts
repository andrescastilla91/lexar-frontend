import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChatbotComponent } from './chatbot.component';
import { MockDataService } from '../../core/services/mock-data.service';
import { Advisor } from '../../core/models/advisor.model';
import { ChatMessage } from '../../core/models/chat-message.model';
import { LegalProcess } from '../../core/models/legal-process.model';

/**
 * Este componente es 100% datos mock (`MockDataService`) — no está detrás
 * del `chatbotFeatureGuard` a nivel de componente, ese guard vive en
 * `core/guards/feature-flag.guard.ts` (routing) y ya tiene su propio spec
 * (`feature-flag.guard.spec.ts`). Aquí solo se prueba la lógica propia del
 * componente: filtrado de historial, envío de mensajes y generación de
 * respuestas simuladas.
 */
describe('ChatbotComponent', () => {
  let mockDataServiceMock: {
    processes: WritableSignal<LegalProcess[]>;
    chatHistory: WritableSignal<ChatMessage[]>;
    dashboardSnapshot: jest.Mock;
    addChatMessage: jest.Mock;
    findProcessById: jest.Mock;
    findAdvisorById: jest.Mock;
  };

  const processA: LegalProcess = {
    id: 'proc-a',
    title: 'Demanda civil por incumplimiento',
    court: 'Juzgado 1 Civil',
    clientId: 'client-a',
    advisorId: 'adv-a',
    status: 'En curso',
    stage: 'Audiencia',
    riskLevel: 'Alto',
    nextHearingDate: '2026-09-10',
    updatedAt: '2026-08-01',
  };

  const processB: LegalProcess = {
    id: 'proc-b',
    title: 'Negociación colectiva',
    court: 'Ministerio de Trabajo',
    clientId: 'client-b',
    advisorId: 'adv-b',
    status: 'En curso',
    stage: 'Notificación',
    riskLevel: 'Bajo',
    nextHearingDate: '2026-09-15',
    updatedAt: '2026-08-02',
  };

  const advisor: Advisor = {
    id: 'adv-a',
    name: 'Laura Gómez',
    email: 'laura@lexar.com',
    phone: '+57 300 000 0000',
    specialty: 'Derecho Corporativo',
    status: 'Disponible',
    rating: 4.9,
    experienceYears: 10,
  };

  const messageFromA: ChatMessage = {
    id: 'm1',
    author: 'usuario',
    content: 'Mensaje sobre el proceso A',
    timestamp: '2026-08-19T09:00:00Z',
    relatedProcessId: 'proc-a',
  };

  const messageFromB: ChatMessage = {
    id: 'm2',
    author: 'asistente',
    content: 'Respuesta sobre el proceso B',
    timestamp: '2026-08-19T09:01:00Z',
    relatedProcessId: 'proc-b',
    sentiment: 'neutral',
  };

  function configure(
    options: {
      chatHistory?: ChatMessage[];
      processes?: LegalProcess[];
      highRiskProcesses?: LegalProcess[];
      hearingsThisMonth?: LegalProcess[];
    } = {},
  ) {
    const chatHistorySignal = signal<ChatMessage[]>(options.chatHistory ?? [messageFromA, messageFromB]);
    const processesSignal = signal<LegalProcess[]>(options.processes ?? [processA, processB]);

    mockDataServiceMock = {
      processes: processesSignal,
      chatHistory: chatHistorySignal,
      dashboardSnapshot: jest.fn().mockReturnValue({
        highRiskProcesses: options.highRiskProcesses ?? [processA],
        hearingsThisMonth: options.hearingsThisMonth ?? [processA, processB],
      }),
      addChatMessage: jest.fn((message: ChatMessage) => chatHistorySignal.update((list) => [...list, message])),
      findProcessById: jest.fn((id: string) => processesSignal().find((p) => p.id === id)),
      findAdvisorById: jest.fn((id: string) => (id === advisor.id ? advisor : undefined)),
    };

    return TestBed.configureTestingModule({
      imports: [ChatbotComponent],
      providers: [{ provide: MockDataService, useValue: mockDataServiceMock }],
    }).compileComponents();
  }

  function createComponent() {
    const fixture = TestBed.createComponent(ChatbotComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  afterEach(() => {
    jest.useRealTimers();
  });

  it('por defecto (filtro "todos"), muestra el historial completo', async () => {
    await configure();
    const component = createComponent();

    expect(component.filteredMessages()).toEqual([messageFromA, messageFromB]);
  });

  it('al filtrar por un proceso puntual, solo muestra los mensajes relacionados', async () => {
    await configure();
    const component = createComponent();

    component.filterForm.patchValue({ processId: 'proc-a' });

    expect(component.filteredMessages()).toEqual([messageFromA]);
  });

  it('usePrompt coloca la sugerencia en el textarea del formulario', async () => {
    await configure();
    const component = createComponent();

    component.usePrompt('¿Qué procesos tienen audiencias esta semana?');

    expect(component.messageForm.value.message).toBe('¿Qué procesos tienen audiencias esta semana?');
  });

  it('sendMessage con formulario inválido, no hace nada', async () => {
    await configure();
    const component = createComponent();
    component.messageForm.patchValue({ message: 'hi' }); // menor a 5 caracteres

    component.sendMessage();

    expect(mockDataServiceMock.addChatMessage).not.toHaveBeenCalled();
  });

  it('sendMessage mientras ya hay un envío en curso, no hace nada', async () => {
    await configure();
    const component = createComponent();
    component.messageForm.patchValue({ message: 'Mensaje válido' });
    component.isProcessing.set(true);

    component.sendMessage();

    expect(mockDataServiceMock.addChatMessage).not.toHaveBeenCalled();
  });

  it('sendMessage agrega el mensaje del usuario de inmediato y, tras el delay, la respuesta del asistente', async () => {
    jest.useFakeTimers();
    await configure();
    const component = createComponent();
    component.messageForm.setValue({ message: 'Genera un resumen ejecutivo', includeSummary: true });

    component.sendMessage();

    expect(mockDataServiceMock.addChatMessage).toHaveBeenCalledTimes(1);
    const userMessage = mockDataServiceMock.addChatMessage.mock.calls[0][0] as ChatMessage;
    expect(userMessage.author).toBe('usuario');
    expect(userMessage.content).toBe('Genera un resumen ejecutivo');
    expect(component.isProcessing()).toBe(true);
    expect(component.messageForm.value.message).toBe('');
    expect(component.messageForm.value.includeSummary).toBe(true);

    jest.advanceTimersByTime(800);

    expect(mockDataServiceMock.addChatMessage).toHaveBeenCalledTimes(2);
    const assistantMessage = mockDataServiceMock.addChatMessage.mock.calls[1][0] as ChatMessage;
    expect(assistantMessage.author).toBe('asistente');
    expect(component.isProcessing()).toBe(false);
  });

  it('sendMessage con un proceso filtrado, la respuesta describe ese proceso puntual', async () => {
    jest.useFakeTimers();
    await configure();
    const component = createComponent();
    component.filterForm.patchValue({ processId: 'proc-a' });
    component.messageForm.setValue({ message: 'Cuéntame del estado', includeSummary: false });

    component.sendMessage();
    jest.advanceTimersByTime(800);

    const assistantMessage = mockDataServiceMock.addChatMessage.mock.calls[1][0] as ChatMessage;
    expect(assistantMessage.content).toContain('Demanda civil por incumplimiento');
    expect(assistantMessage.content).toContain('Laura Gómez');
    expect(assistantMessage.relatedProcessId).toBe('proc-a');
  });

  it('sendMessage con la palabra "riesgo", responde con el conteo de procesos en riesgo alto', async () => {
    jest.useFakeTimers();
    await configure({ highRiskProcesses: [processA, processB] });
    const component = createComponent();
    component.messageForm.setValue({ message: '¿Cuántos procesos hay en riesgo?', includeSummary: false });

    component.sendMessage();
    jest.advanceTimersByTime(800);

    const assistantMessage = mockDataServiceMock.addChatMessage.mock.calls[1][0] as ChatMessage;
    expect(assistantMessage.content).toContain('2 procesos clasificados en riesgo alto');
    expect(assistantMessage.sentiment).toBe('alerta');
  });

  it('sendMessage con la palabra "audiencia", responde con el conteo de audiencias del mes', async () => {
    jest.useFakeTimers();
    await configure({ hearingsThisMonth: [processA] });
    const component = createComponent();
    component.messageForm.setValue({ message: '¿Hay audiencias esta semana?', includeSummary: false });

    component.sendMessage();
    jest.advanceTimersByTime(800);

    const assistantMessage = mockDataServiceMock.addChatMessage.mock.calls[1][0] as ChatMessage;
    expect(assistantMessage.content).toContain('1 audiencias programadas este mes');
  });

  it('sendMessage sin coincidencias conocidas, responde con el mensaje genérico', async () => {
    jest.useFakeTimers();
    await configure();
    const component = createComponent();
    component.messageForm.setValue({ message: 'Actualiza el expediente por favor', includeSummary: false });

    component.sendMessage();
    jest.advanceTimersByTime(800);

    const assistantMessage = mockDataServiceMock.addChatMessage.mock.calls[1][0] as ChatMessage;
    expect(assistantMessage.content).toContain('He actualizado el registro');
    expect(assistantMessage.sentiment).toBe('neutral');
  });

  it('sendMessage con "gracias", detecta sentimiento positivo', async () => {
    jest.useFakeTimers();
    await configure();
    const component = createComponent();
    component.messageForm.setValue({ message: 'Muchas gracias por la ayuda', includeSummary: false });

    component.sendMessage();
    jest.advanceTimersByTime(800);

    const assistantMessage = mockDataServiceMock.addChatMessage.mock.calls[1][0] as ChatMessage;
    expect(assistantMessage.sentiment).toBe('positivo');
  });

  it('authorLabel traduce el autor a una etiqueta legible', async () => {
    await configure();
    const component = createComponent();

    expect(component.authorLabel('usuario')).toBe('Tú');
    expect(component.authorLabel('asistente')).toBe('Asistente LexAr');
  });

  it('sentimentClasses y sentimentDot cubren los tres estados posibles', async () => {
    await configure();
    const component = createComponent();

    expect(component.sentimentClasses('positivo')).toContain('emerald');
    expect(component.sentimentClasses('alerta')).toContain('rose');
    expect(component.sentimentClasses('neutral')).toContain('slate');

    expect(component.sentimentDot('positivo')).toContain('emerald');
    expect(component.sentimentDot('alerta')).toContain('rose');
    expect(component.sentimentDot('neutral')).toBeTruthy();
  });

  it('processName resuelve el título del proceso o un texto por defecto si no existe', async () => {
    await configure();
    const component = createComponent();

    expect(component.processName('proc-a')).toBe('Demanda civil por incumplimiento');
    expect(component.processName('proc-inexistente')).toBe('Proceso no identificado');
  });
});
