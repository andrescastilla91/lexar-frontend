import { getAdvisorFullName, getAdvisorInitials } from './advisor-format.utils';
import { AdvisorResponse, AdvisorStatus } from '../../../core/models/advisor-backend.model';

function buildAdvisor(overrides: Partial<AdvisorResponse> = {}): AdvisorResponse {
  return {
    id: 'a1',
    userId: 'u1',
    specialty: null,
    phone: null,
    status: AdvisorStatus.AVAILABLE,
    rating: null,
    experienceYears: 5,
    isActive: true,
    companyId: 'c1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('advisor-format.utils', () => {
  describe('getAdvisorFullName', () => {
    it('devuelve el nombre completo cuando el asesor tiene usuario asociado', () => {
      const advisor = buildAdvisor({ user: { id: 'u1', firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' } });
      expect(getAdvisorFullName(advisor)).toBe('Ana Gómez');
    });

    it('devuelve "Sin nombre" cuando el asesor no tiene usuario asociado', () => {
      const advisor = buildAdvisor({ user: undefined });
      expect(getAdvisorFullName(advisor)).toBe('Sin nombre');
    });
  });

  describe('getAdvisorInitials', () => {
    it('devuelve las iniciales en mayúscula cuando el asesor tiene usuario asociado', () => {
      const advisor = buildAdvisor({ user: { id: 'u1', firstName: 'ana', lastName: 'gómez', email: 'ana@lexar.com' } });
      expect(getAdvisorInitials(advisor)).toBe('AG');
    });

    it('devuelve "??" cuando el asesor no tiene usuario asociado', () => {
      const advisor = buildAdvisor({ user: undefined });
      expect(getAdvisorInitials(advisor)).toBe('??');
    });
  });
});
