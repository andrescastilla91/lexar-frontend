export interface ParsedAiAnswer {
  intro: string;
  items: string[];
}

/**
 * F20.1 — el backend (`AnswerTemplateService`) separa una intro de un
 * bloque de ítems con una línea en blanco ("\n\n") cuando la respuesta es
 * un listado (capacidades, sugerencias, carga por asesor, documentos
 * recientes). Este parser solo reconoce ese formato — cualquier otro
 * contenido (la mayoría de las respuestas, que son una sola frase con
 * datos) devuelve `null` y el componente lo renderiza como texto plano.
 */
export function parseAiListAnswer(content: string): ParsedAiAnswer | null {
  const parts = content.split('\n\n');
  if (parts.length !== 2) {
    return null;
  }

  const [intro, itemsBlock] = parts;
  const items = itemsBlock
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (items.length < 2) {
    return null;
  }

  return { intro: intro.trim(), items };
}
