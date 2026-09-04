/**
 * F20.1 — contrato del asistente IA Nivel 0 (sin LLM). Los tipos reflejan
 * exactamente `AiMessageResponse`/`ChatResponseBody`/`ChatHistoryBody` del
 * backend (ver `ai-chat.service.ts` y `ai.controller.ts` en lexar-backend).
 */

export type AiChatRole = 'user' | 'assistant';
export type AiChatFeedback = 'up' | 'down';

export interface AiChatLink {
  label: string;
  path: string;
}

export interface AiChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  intentId: string | null;
  understood: boolean;
  feedback: AiChatFeedback | null;
  links: AiChatLink[];
  createdAt: string;
}

export interface AiChatResponse {
  conversationId: string;
  userMessage: AiChatMessage;
  assistantMessage: AiChatMessage;
}

export interface AiChatHistory {
  conversationId: string | null;
  messages: AiChatMessage[];
}

/**
 * Chips de preguntas sugeridas — reflejan `examplePrompt` del catálogo del
 * backend (`intent-catalog.ts`). Se mantienen aquí en vez de exponer el
 * catálogo completo por un endpoint nuevo: son solo ejemplos de arranque,
 * no una fuente de verdad que el frontend necesite sincronizar en runtime.
 */
export const AI_CHAT_SUGGESTED_PROMPTS: string[] = [
  '¿Qué audiencias tengo esta semana?',
  '¿Qué plazos están por vencer?',
  '¿Cuáles son mis tareas pendientes?',
  '¿Cuántos procesos activos tengo?',
  '¿Cómo está repartida la carga por asesor?',
  '¿Qué puedes hacer?',
];
