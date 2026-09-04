import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { ChatWidgetComponent } from './chat-widget.component';
import { SubscriptionService } from '../services/subscription.service';
import { AiChatService } from '../services/ai-chat.service';
import { ToastService } from '../services/toast.service';
import { Entitlements } from '../models/subscription-backend.model';

/**
 * HU-F20-1-b — botón flotante global del asistente IA. Cubre: gate por
 * entitlement `chatbot` (mismo criterio que `chatbotFeatureGuard` y
 * `MainLayoutComponent.chatbotEnabled`), ocultamiento en /chatbot (evita
 * UI duplicada) y apertura/cierre del panel embebido.
 */
describe('ChatWidgetComponent', () => {
  beforeAll(() => {
    // El panel embebido (AiChatPanelComponent) hace autoscroll con
    // scrollIntoView, no implementado en jsdom.
    Element.prototype.scrollIntoView = jest.fn();
  });

  let subscriptionServiceMock: { getEntitlements: jest.Mock };
  let routerEvents: Subject<NavigationEnd>;

  function configure(chatbotEnabled: boolean, initialUrl = '/dashboard') {
    subscriptionServiceMock = {
      getEntitlements: jest.fn().mockReturnValue(of({ features: { chatbot: chatbotEnabled } } as Entitlements)),
    };
    routerEvents = new Subject<NavigationEnd>();

    return TestBed.configureTestingModule({
      imports: [ChatWidgetComponent],
      providers: [
        { provide: Router, useValue: { url: initialUrl, events: routerEvents } },
        { provide: SubscriptionService, useValue: subscriptionServiceMock },
        {
          provide: AiChatService,
          useValue: {
            getHistory: jest.fn().mockReturnValue(of({ conversationId: null, messages: [] })),
            sendMessage: jest.fn(),
            setFeedback: jest.fn(),
          },
        },
        { provide: ToastService, useValue: { success: jest.fn(), error: jest.fn() } },
      ],
    }).compileComponents();
  }

  function createComponent() {
    const fixture = TestBed.createComponent(ChatWidgetComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('no renderiza el botón si el plan no incluye el entitlement chatbot', async () => {
    await configure(false);
    const { fixture } = createComponent();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('renderiza el botón flotante si el plan incluye chatbot', async () => {
    await configure(true);
    const { fixture } = createComponent();

    expect(fixture.nativeElement.querySelector('button[aria-label="Abrir asistente LexAr"]')).not.toBeNull();
  });

  it('se oculta en /chatbot para no duplicar la UI del asistente', async () => {
    await configure(true);
    const { fixture, component } = createComponent();

    // Simula la navegación a /chatbot con el mismo evento que
    // MainLayoutComponent escucha para su propio estado de ruta activa.
    routerEvents.next(new NavigationEnd(1, '/chatbot', '/chatbot'));
    fixture.detectChanges();

    expect(component.visible()).toBe(false);
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('el botón abre el panel; el botón de cerrar del panel lo cierra', async () => {
    await configure(true);
    const { fixture, component } = createComponent();

    expect(component.isOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-ai-chat-panel')).toBeNull();

    fixture.nativeElement.querySelector('button[aria-label="Abrir asistente LexAr"]').click();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-ai-chat-panel')).not.toBeNull();

    component.close();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-ai-chat-panel')).toBeNull();
  });
});
