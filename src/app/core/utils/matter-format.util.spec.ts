import { matterStatusClasses, matterStatusLabel } from './matter-format.util';
import { ClientMatterStatus } from '../models/client-backend.model';

describe('matterStatusLabel', () => {
  it('traduce VIGENTE, VENCIDO y TERMINADO a español', () => {
    expect(matterStatusLabel(ClientMatterStatus.VIGENTE)).toBe('Vigente');
    expect(matterStatusLabel(ClientMatterStatus.VENCIDO)).toBe('Vencido');
    expect(matterStatusLabel(ClientMatterStatus.TERMINADO)).toBe('Terminado');
  });

  it('devuelve el valor crudo como fallback si el status no se reconoce', () => {
    expect(matterStatusLabel('OTRO' as ClientMatterStatus)).toBe('OTRO');
  });
});

describe('matterStatusClasses', () => {
  it('devuelve clases de éxito para VIGENTE', () => {
    expect(matterStatusClasses(ClientMatterStatus.VIGENTE)).toContain('text-success');
  });

  it('devuelve clases de peligro para VENCIDO', () => {
    expect(matterStatusClasses(ClientMatterStatus.VENCIDO)).toContain('text-danger');
  });

  it('devuelve clases neutras para TERMINADO', () => {
    expect(matterStatusClasses(ClientMatterStatus.TERMINADO)).toContain('text-subtle');
  });

  it('devuelve un fallback neutro para un status no reconocido', () => {
    expect(matterStatusClasses('OTRO' as ClientMatterStatus)).toBe('bg-surface-muted text-muted');
  });
});
