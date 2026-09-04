import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ChatbotComponent } from './chatbot.component';
import { AiChatService } from '../../core/services/ai-chat.service';
import { ToastService } from '../../core/services/toast.service';

/**
 * F20.1-b — desde que la lógica de conversación se extrajo a
 * `AiChatPanelComponent` (`core/components/`, ver
 * `ai-chat-panel.component.spec.ts` para esa cobertura), este spec solo
 * cubre lo propio del contenedor de página: el layout con la sidebar de
 * contexto y que sus chips de sugerencia delegan en el panel compartido
 * (`ViewChild`) en vez de duplicar el formulario.
 */
describe('ChatbotComponent', () => {
  beforeAll(() => {
    // jsdom no implementa scrollIntoView; lo usa el AiChatPanelComponent
    // embebido en el autoscroll tras cargar el historial.
    Element.prototype.scrollIntoView = jest.fn();
  });

  function configure() {
    return TestBed.configureTestingModule({
      imports: [ChatbotComponent],
      providers: [
        {
          provide: AiChatService,
          useValue: {
            getHistory: jest.fn().mockReturnValue(of({ conversationId: null, messages: [] })),
            sendMessage: jest.fn(),
            setFeedback: jest.fn(),
          },
        },
        { provide: ToastService, useValue: { success: jest.fn(), error: jest.fn() } },
        { provide: Router, useValue: { navigateByUrl: jest.fn() } },
      ],
    }).compileComponents();
  }

  function createComponent() {
    const fixture = TestBed.createComponent(ChatbotComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('renderiza la sidebar de contexto con el disclaimer y el panel del asistente', async () => {
    await configure();
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Asistente LexAr');
    expect(fixture.nativeElement.textContent).toContain('no constituye asesoría legal');
    expect(fixture.nativeElement.querySelector('app-ai-chat-panel')).not.toBeNull();
  });

  it('un chip de sugerencia de la sidebar delega en panel.usePrompt (no duplica el formulario)', async () => {
    await configure();
    const { fixture, component } = createComponent();
    const usePromptSpy = jest.spyOn(component.panel, 'usePrompt');

    const chip: HTMLButtonElement = fixture.nativeElement.querySelector('aside button');
    expect(chip).not.toBeNull();
    chip.click();

    expect(usePromptSpy).toHaveBeenCalledWith(component.suggestedPrompts[0]);
    expect(component.panel.messageForm.value.message).toBe(component.suggestedPrompts[0]);
  });
});
