import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const STORAGE_KEY = 'lexar-theme';
  const PREFERENCE_STORAGE_KEY = 'lexar-theme-preference';

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  function createService(): ThemeService {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    return service;
  }

  it('sin nada en localStorage y sistema en claro, arranca en light con preferencia system', () => {
    const service = createService();

    expect(service.theme()).toBe('light');
    expect(service.preference()).toBe('system');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('respeta el tema guardado en localStorage al arrancar', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const service = createService();

    expect(service.theme()).toBe('dark');
  });

  it('respeta la preferencia guardada en localStorage al arrancar', () => {
    localStorage.setItem(PREFERENCE_STORAGE_KEY, 'dark');
    const service = createService();

    expect(service.preference()).toBe('dark');
  });

  it('ignora un valor inválido de preferencia guardado y usa system', () => {
    localStorage.setItem(PREFERENCE_STORAGE_KEY, 'invalido');
    const service = createService();

    expect(service.preference()).toBe('system');
  });

  it('el effect aplica la clase dark al documentElement cuando el tema es dark', () => {
    const service = createService();

    service.setTheme('dark');
    TestBed.tick();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('el effect remueve la clase dark cuando el tema vuelve a light', () => {
    const service = createService();

    service.setTheme('dark');
    TestBed.tick();
    service.setTheme('light');
    TestBed.tick();

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('toggle alterna entre light y dark y actualiza la preferencia', () => {
    const service = createService();
    expect(service.theme()).toBe('light');

    service.toggle();

    expect(service.theme()).toBe('dark');
    expect(service.preference()).toBe('dark');
    expect(localStorage.getItem(PREFERENCE_STORAGE_KEY)).toBe('dark');

    service.toggle();

    expect(service.theme()).toBe('light');
    expect(service.preference()).toBe('light');
  });

  it('setPreference con "light"/"dark" fija ese modo directamente', () => {
    const service = createService();

    service.setPreference('dark');

    expect(service.preference()).toBe('dark');
    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem(PREFERENCE_STORAGE_KEY)).toBe('dark');
  });

  it('setPreference("system") resuelve el modo según prefers-color-scheme', () => {
    const matchMediaSpy = jest.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    } as unknown as MediaQueryList);

    const service = createService();
    service.setPreference('system');

    expect(service.preference()).toBe('system');
    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem(PREFERENCE_STORAGE_KEY)).toBe('system');

    matchMediaSpy.mockRestore();
  });
});
