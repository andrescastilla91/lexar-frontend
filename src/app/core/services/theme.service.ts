import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'lexar-theme';
const PREFERENCE_STORAGE_KEY = 'lexar-theme-preference';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<ThemeMode>(this.resolveInitialTheme());
  readonly preference = signal<ThemePreference>(this.resolveInitialPreference());

  constructor() {
    effect(() => {
      const mode = this.theme();
      document.documentElement.classList.toggle('dark', mode === 'dark');
      localStorage.setItem(STORAGE_KEY, mode);
    });
  }

  toggle(): void {
    this.theme.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
    const resolved = this.theme();
    this.preference.set(resolved);
    localStorage.setItem(PREFERENCE_STORAGE_KEY, resolved);
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
  }

  /** Aplica una preferencia (incluyendo 'system') sin escribirla al backend — usado al sincronizar desde el perfil del servidor. */
  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
    localStorage.setItem(PREFERENCE_STORAGE_KEY, preference);
    this.theme.set(this.resolveModeFromPreference(preference));
  }

  private resolveModeFromPreference(preference: ThemePreference): ThemeMode {
    if (preference === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return preference;
  }

  private resolveInitialPreference(): ThemePreference {
    const stored = localStorage.getItem(PREFERENCE_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  }

  private resolveInitialTheme(): ThemeMode {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
