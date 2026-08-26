import { ProcessStatus } from '../../../core/models/legal-process.model';
import { ProcessEventType } from '../../../core/models/process-event.model';
import {
  formatBytes,
  formatDate,
  getEventColor,
  getEventIcon,
  getEventLabel,
  getStatusClasses,
  getStatusDot,
  getStatusLabel,
  getValidNextStatuses,
  isProcessEditable,
} from './process-format.utils';

describe('process-format.utils', () => {
  describe('formatDate', () => {
    it('formatea una fecha como YYYY-MM-DD HH:mm', () => {
      const date = new Date(2026, 0, 15, 9, 5);
      expect(formatDate(date)).toBe('2026-01-15 09:05');
    });

    it('acepta un string de fecha', () => {
      expect(formatDate('2026-03-01T00:00:00')).toBe('2026-03-01 00:00');
    });

    it('devuelve N/A si no recibe fecha', () => {
      expect(formatDate(null as unknown as Date)).toBe('N/A');
    });
  });

  describe('formatBytes', () => {
    it('devuelve 0 Bytes para cero', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('formatea bytes pequeños', () => {
      expect(formatBytes(500)).toBe('500 Bytes');
    });

    it('formatea kilobytes', () => {
      expect(formatBytes(2048)).toBe('2 KB');
    });

    it('formatea megabytes', () => {
      expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
    });
  });

  describe('getStatusLabel', () => {
    it('traduce cada estado conocido', () => {
      expect(getStatusLabel(ProcessStatus.DRAFT)).toBe('Borrador');
      expect(getStatusLabel(ProcessStatus.ACTIVE)).toBe('Activo');
      expect(getStatusLabel(ProcessStatus.UNDER_REVIEW)).toBe('En Revisión');
      expect(getStatusLabel(ProcessStatus.SUSPENDED)).toBe('Suspendido');
      expect(getStatusLabel(ProcessStatus.COMPLETED)).toBe('Completado');
      expect(getStatusLabel(ProcessStatus.CANCELLED)).toBe('Cancelado');
      expect(getStatusLabel(ProcessStatus.ARCHIVED)).toBe('Archivado');
    });

    it('devuelve el valor crudo si el estado no está en el mapa', () => {
      expect(getStatusLabel('UNKNOWN' as ProcessStatus)).toBe('UNKNOWN');
    });
  });

  describe('isProcessEditable', () => {
    it('es editable en DRAFT, ACTIVE y SUSPENDED', () => {
      expect(isProcessEditable(ProcessStatus.DRAFT)).toBe(true);
      expect(isProcessEditable(ProcessStatus.ACTIVE)).toBe(true);
      expect(isProcessEditable(ProcessStatus.SUSPENDED)).toBe(true);
    });

    it('no es editable en estados finales o en revisión', () => {
      expect(isProcessEditable(ProcessStatus.UNDER_REVIEW)).toBe(false);
      expect(isProcessEditable(ProcessStatus.COMPLETED)).toBe(false);
      expect(isProcessEditable(ProcessStatus.CANCELLED)).toBe(false);
      expect(isProcessEditable(ProcessStatus.ARCHIVED)).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    it('DRAFT puede pasar a ACTIVE o CANCELLED', () => {
      expect(getValidNextStatuses(ProcessStatus.DRAFT)).toEqual([
        ProcessStatus.ACTIVE,
        ProcessStatus.CANCELLED,
      ]);
    });

    it('ACTIVE puede pasar a UNDER_REVIEW, SUSPENDED o CANCELLED', () => {
      expect(getValidNextStatuses(ProcessStatus.ACTIVE)).toEqual([
        ProcessStatus.UNDER_REVIEW,
        ProcessStatus.SUSPENDED,
        ProcessStatus.CANCELLED,
      ]);
    });

    it('COMPLETED solo puede pasar a ARCHIVED', () => {
      expect(getValidNextStatuses(ProcessStatus.COMPLETED)).toEqual([ProcessStatus.ARCHIVED]);
    });

    it('CANCELLED y ARCHIVED no tienen transiciones', () => {
      expect(getValidNextStatuses(ProcessStatus.CANCELLED)).toEqual([]);
      expect(getValidNextStatuses(ProcessStatus.ARCHIVED)).toEqual([]);
    });
  });

  describe('getStatusClasses / getStatusDot', () => {
    it('devuelve clases conocidas para ACTIVE', () => {
      expect(getStatusClasses(ProcessStatus.ACTIVE)).toBe('bg-info-tint text-info');
      expect(getStatusDot(ProcessStatus.ACTIVE)).toBe('bg-primary');
    });

    it('devuelve la clase por defecto para un estado desconocido', () => {
      expect(getStatusClasses('UNKNOWN' as ProcessStatus)).toBe('bg-surface-muted text-text');
      expect(getStatusDot('UNKNOWN' as ProcessStatus)).toBe('bg-subtle');
    });
  });

  describe('getEventIcon / getEventColor / getEventLabel', () => {
    it('devuelve valores específicos para ANNOTATION', () => {
      expect(getEventColor(ProcessEventType.ANNOTATION)).toBe('bg-info-tint text-primary');
      expect(getEventLabel(ProcessEventType.ANNOTATION)).toBe('Anotación');
      expect(getEventIcon(ProcessEventType.ANNOTATION)).toContain('m16.862');
    });

    it('devuelve valores por defecto para un tipo desconocido', () => {
      const unknown = 'UNKNOWN' as ProcessEventType;
      expect(getEventColor(unknown)).toBe('bg-surface-muted text-muted');
      expect(getEventLabel(unknown)).toBe('Evento');
      expect(getEventIcon(unknown)).toContain('M6.75 12');
    });

    it('traduce todos los tipos de evento conocidos sin caer en el default', () => {
      const types = [
        ProcessEventType.STATUS_CHANGE,
        ProcessEventType.ADVISOR_ASSIGNED,
        ProcessEventType.ADVISOR_REMOVED,
        ProcessEventType.PROCESS_CREATED,
        ProcessEventType.PROCESS_UPDATED,
        ProcessEventType.CLIENT_CHANGED,
        ProcessEventType.DOCUMENT_UPLOADED,
      ];

      for (const type of types) {
        expect(getEventLabel(type)).not.toBe('Evento');
        expect(getEventColor(type)).not.toBe('bg-surface-muted text-muted');
      }
    });
  });
});
