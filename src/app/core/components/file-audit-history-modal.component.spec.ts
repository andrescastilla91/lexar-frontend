import { TestBed } from '@angular/core/testing';
import { FileAuditHistoryModalComponent } from './file-audit-history-modal.component';
import { FileAuditLogEntry } from '../models/file.model';

// F43 §5: el modal ya no traduce `action` localmente — confía en
// `actionLabel`, provisto por el backend con el mismo catálogo que
// alimenta el módulo de auditoría general (ver
// modules/audit/audit-log-translations.ts). Este spec fija ese contrato:
// lo que llega en `actionLabel` es exactamente lo que se pinta.
describe('FileAuditHistoryModalComponent', () => {
  function createComponent(entries: FileAuditLogEntry[]) {
    const fixture = TestBed.createComponent(FileAuditHistoryModalComponent);
    fixture.componentRef.setInput('file', { originalFilename: 'Poder.pdf' });
    fixture.componentRef.setInput('entries', entries);
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FileAuditHistoryModalComponent],
    });
  });

  it('pinta actionLabel tal como llega, sin volver a traducir action', () => {
    const entries: FileAuditLogEntry[] = [
      {
        id: 'log-1',
        action: 'download',
        actionLabel: 'Descargó',
        userEmail: 'abogado@lexar.com',
        source: 'internal',
        createdAt: new Date('2026-09-29'),
      },
    ];

    const { fixture } = createComponent(entries);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Descargó');
  });

  it('un actionLabel con texto no catalogado igual se pinta tal cual (el fallback ya vino resuelto del backend)', () => {
    const entries: FileAuditLogEntry[] = [
      {
        id: 'log-2',
        action: 'evento_futuro',
        actionLabel: 'evento futuro',
        userEmail: 'abogado@lexar.com',
        source: 'internal',
        createdAt: new Date('2026-09-29'),
      },
    ];

    const { fixture } = createComponent(entries);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('evento futuro');
  });

  it('sin entradas, muestra el estado vacío en vez de una lista', () => {
    const { fixture } = createComponent([]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Sin actividad registrada todavía.');
  });
});
