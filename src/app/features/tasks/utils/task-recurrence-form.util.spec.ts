import {
  RecurrenceFrequency,
} from '../../../core/models/task-recurrence.model';
import { TaskPriority } from '../../../core/models/task.model';
import {
  RecurrenceFormValue,
  buildCreateRecurrenceRequest,
  buildRuleUpdate,
} from './task-recurrence-form.util';

describe('task-recurrence-form.util', () => {
  const value = (overrides: Partial<RecurrenceFormValue> = {}): RecurrenceFormValue => ({
    repeat: true,
    frequency: RecurrenceFrequency.MONTHLY,
    endMode: 'NEVER',
    endDate: '',
    maxOccurrences: 12,
    ...overrides,
  });

  const base = { title: 'Revisión mensual', priority: TaskPriority.NORMAL };

  describe('buildCreateRecurrenceRequest', () => {
    it('toma fecha de inicio y hora de vencimiento del datetime-local', () => {
      const result = buildCreateRecurrenceRequest(base, '2026-11-05T09:30', value());

      expect(result).toEqual({
        ok: true,
        value: {
          title: 'Revisión mensual',
          priority: TaskPriority.NORMAL,
          frequency: RecurrenceFrequency.MONTHLY,
          startDate: '2026-11-05',
          dueTime: '09:30',
        },
      });
    });

    it('exige el primer vencimiento', () => {
      const result = buildCreateRecurrenceRequest(base, '', value());

      expect(result.ok).toBe(false);
    });

    it('fin por fecha: envía solo endDate', () => {
      const result = buildCreateRecurrenceRequest(
        base,
        '2026-11-05T09:30',
        value({ endMode: 'DATE', endDate: '2027-11-05' }),
      );

      expect(result.ok && result.value.endDate).toBe('2027-11-05');
      expect(result.ok && result.value.maxOccurrences).toBeUndefined();
    });

    it('fin por fecha sin fecha elegida es error', () => {
      const result = buildCreateRecurrenceRequest(
        base,
        '2026-11-05T09:30',
        value({ endMode: 'DATE', endDate: '' }),
      );

      expect(result.ok).toBe(false);
    });

    it('fin por número: envía solo maxOccurrences y valida el rango', () => {
      const ok = buildCreateRecurrenceRequest(
        base,
        '2026-11-05T09:30',
        value({ endMode: 'COUNT', maxOccurrences: 6 }),
      );
      expect(ok.ok && ok.value.maxOccurrences).toBe(6);
      expect(ok.ok && ok.value.endDate).toBeUndefined();

      for (const bad of [0, -1, 1.5, 1001, null]) {
        expect(
          buildCreateRecurrenceRequest(
            base,
            '2026-11-05T09:30',
            value({ endMode: 'COUNT', maxOccurrences: bad }),
          ).ok,
        ).toBe(false);
      }
    });
  });

  describe('buildRuleUpdate', () => {
    it('sin fin envía ambos null para limpiar cualquier fin anterior', () => {
      expect(buildRuleUpdate(value())).toEqual({
        ok: true,
        value: {
          frequency: RecurrenceFrequency.MONTHLY,
          endDate: null,
          maxOccurrences: null,
        },
      });
    });

    it('por fecha limpia el número y por número limpia la fecha', () => {
      const byDate = buildRuleUpdate(value({ endMode: 'DATE', endDate: '2027-01-31' }));
      expect(byDate.ok && byDate.value).toEqual(
        expect.objectContaining({ endDate: '2027-01-31', maxOccurrences: null }),
      );

      const byCount = buildRuleUpdate(value({ endMode: 'COUNT', maxOccurrences: 4 }));
      expect(byCount.ok && byCount.value).toEqual(
        expect.objectContaining({ endDate: null, maxOccurrences: 4 }),
      );
    });

    it('propaga el error de validación', () => {
      expect(buildRuleUpdate(value({ endMode: 'COUNT', maxOccurrences: 0 })).ok).toBe(
        false,
      );
    });
  });
});
