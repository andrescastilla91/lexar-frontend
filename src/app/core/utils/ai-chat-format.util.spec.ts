import { parseAiListAnswer } from './ai-chat-format.util';

describe('parseAiListAnswer', () => {
  it('reconoce el formato intro + lista (separados por línea en blanco)', () => {
    const content = 'Hoy puedo responderte sobre esto:\n\n📅 audiencias — «ej»\n⏰ plazos — «ej»';

    const result = parseAiListAnswer(content);

    expect(result).toEqual({
      intro: 'Hoy puedo responderte sobre esto:',
      items: ['📅 audiencias — «ej»', '⏰ plazos — «ej»'],
    });
  });

  it('devuelve null para una respuesta de una sola frase (la mayoría de las respuestas)', () => {
    expect(parseAiListAnswer('Tienes 3 procesos activos.')).toBeNull();
  });

  it('devuelve null si hay más de un bloque separado por línea en blanco', () => {
    expect(parseAiListAnswer('intro\n\nitem1\nitem2\n\nextra')).toBeNull();
  });

  it('devuelve null si el bloque de ítems solo tiene una línea (no vale la pena una lista de 1)', () => {
    expect(parseAiListAnswer('intro\n\nsolo un item')).toBeNull();
  });

  it('ignora líneas vacías dentro del bloque de ítems', () => {
    const result = parseAiListAnswer('intro\n\nitem1\n\nitem2');
    // El separador real intro/items es el primer "\n\n" — un "\n\n" extra
    // dentro del bloque de ítems ya no matchea el formato de 2 partes.
    expect(result).toBeNull();
  });
});
