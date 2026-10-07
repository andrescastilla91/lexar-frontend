import { MENU_GROUP_LABELS, MENU_ITEMS, MenuItem, groupMenuItems } from './menu-items';

describe('menú lateral — agrupación (F48)', () => {
  it('cada ítem declara un grupo conocido', () => {
    for (const item of MENU_ITEMS) {
      expect(Object.keys(MENU_GROUP_LABELS)).toContain(item.group);
    }
  });

  it('no hay rutas repetidas', () => {
    const routes = MENU_ITEMS.map((item) => item.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('agrupa por dominio en el orden Dashboard, Trabajo, Asistencia, Administración', () => {
    const groups = groupMenuItems(MENU_ITEMS);

    expect(groups.map((group) => group.label)).toEqual([null, 'Trabajo', 'Asistencia', 'Administración']);
    expect(groups[0].items.map((item) => item.label)).toEqual(['Dashboard']);
    expect(groups[1].items.map((item) => item.label)).toEqual([
      'Clientes',
      'Procesos',
      'Calendario',
      'Tareas',
      'Documentos',
    ]);
    expect(groups[2].items.map((item) => item.label)).toEqual(['Lexi']);
    expect(groups[3].items.map((item) => item.label)).toEqual(['Usuarios', 'Roles', 'Auditoría', 'Configuración']);
  });

  it('Configuración de la empresa está en el menú y exige companies.edit', () => {
    const settings = MENU_ITEMS.find((item) => item.route === '/configuracion');

    expect(settings?.group).toBe('admin');
    expect(settings?.permissions).toEqual(['companies.edit']);
  });

  it('un grupo sin ítems visibles no aparece (ni su encabezado)', () => {
    const onlyWork: MenuItem[] = MENU_ITEMS.filter((item) => item.group === 'main' || item.group === 'work');

    const groups = groupMenuItems(onlyWork);

    expect(groups.map((group) => group.id)).toEqual(['main', 'work']);
  });

  it('sin ítems no devuelve grupos', () => {
    expect(groupMenuItems([])).toEqual([]);
  });

  it('conserva los permisos que ya exigía cada entrada', () => {
    const permissions = Object.fromEntries(MENU_ITEMS.map((item) => [item.route, item.permissions]));

    expect(permissions).toMatchObject({
      '/dashboard': undefined,
      '/clientes': ['clients.list'],
      '/procesos': ['legal_processes.list'],
      '/calendario': ['deadlines.view'],
      '/tareas': ['tasks.view'],
      '/documentos': ['files.view'],
      '/chatbot': undefined,
      '/usuarios': ['users.list'],
      '/roles': ['roles.list'],
      '/auditoria': ['audit.view'],
    });
  });
});
