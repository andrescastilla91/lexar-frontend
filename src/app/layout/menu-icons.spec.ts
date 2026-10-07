import { MENU_ICONS } from './menu-icons';

describe('MENU_ICONS (BUG-32)', () => {
  const entries = Object.entries(MENU_ICONS);

  it.each(entries)('%s es un path SVG bien formado', (_key, path) => {
    expect(path.length).toBeGreaterThan(0);
    expect(path).toMatch(/^[Mm]/);
    expect(path).toMatch(/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s-]+$/);
  });

  it('no hay dos claves con el mismo path', () => {
    const paths = entries.map(([, path]) => path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('Dashboard ya no es la hamburguesa (tres líneas horizontales)', () => {
    expect(MENU_ICONS.dashboard).not.toBe('M3.75 5.25h16.5m-16.5 6h16.5m-16.5 6h16.5');
  });
});
