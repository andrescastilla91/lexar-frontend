import { MENU_ICONS } from './menu-icons';

export type MenuGroupId = 'main' | 'work' | 'assistant' | 'admin';

export interface MenuItem {
  label: string;
  description: string;
  icon: string;
  route: string;
  group: MenuGroupId;
  permissions?: string[];
}

export interface MenuGroup {
  id: MenuGroupId;
  /** `null` = grupo sin encabezado (el Dashboard, punto de entrada). */
  label: string | null;
  items: MenuItem[];
}

export const MENU_GROUP_LABELS: Record<MenuGroupId, string | null> = {
  main: null,
  work: 'Trabajo',
  assistant: 'Asistencia',
  admin: 'Administración',
};

const GROUP_ORDER: MenuGroupId[] = ['main', 'work', 'assistant', 'admin'];

export const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    description: 'Resumen de actividad y riesgos',
    icon: MENU_ICONS.dashboard,
    route: '/dashboard',
    group: 'main',
  },
  {
    label: 'Clientes',
    description: 'Portafolio y riesgos asociados',
    icon: MENU_ICONS.clients,
    route: '/clientes',
    group: 'work',
    permissions: ['clients.list'],
  },
  {
    label: 'Procesos',
    description: 'Seguimiento procesal detallado',
    icon: MENU_ICONS.processes,
    route: '/procesos',
    group: 'work',
    permissions: ['legal_processes.list'],
  },
  {
    label: 'Calendario',
    description: 'Plazos y audiencias del despacho',
    icon: MENU_ICONS.calendar,
    route: '/calendario',
    group: 'work',
    permissions: ['deadlines.view'],
  },
  {
    label: 'Tareas',
    description: 'Trabajo asignado y plantillas por proceso',
    icon: MENU_ICONS.tasks,
    route: '/tareas',
    group: 'work',
    permissions: ['tasks.view'],
  },
  {
    label: 'Documentos',
    description: 'Control y cargue seguro',
    icon: MENU_ICONS.documents,
    route: '/documentos',
    group: 'work',
    permissions: ['files.view'],
  },
  {
    label: 'Lexi',
    description: 'Asistente para consultas operativas',
    icon: MENU_ICONS.assistant,
    route: '/chatbot',
    group: 'assistant',
  },
  {
    label: 'Usuarios',
    description: 'Gestión de cuentas y equipos',
    icon: MENU_ICONS.users,
    route: '/usuarios',
    group: 'admin',
    permissions: ['users.list'],
  },
  {
    label: 'Roles',
    description: 'Permisos y control de acceso',
    icon: MENU_ICONS.roles,
    route: '/roles',
    group: 'admin',
    permissions: ['roles.list'],
  },
  {
    label: 'Auditoría',
    description: 'Registro de actividad de la empresa',
    icon: MENU_ICONS.audit,
    route: '/auditoria',
    group: 'admin',
    permissions: ['audit.view'],
  },
  {
    label: 'Configuración',
    description: 'Datos, catálogos, plan y seguridad de la empresa',
    icon: MENU_ICONS.settings,
    route: '/configuracion',
    group: 'admin',
    permissions: ['companies.edit'],
  },
];

/** Agrupa los ítems ya filtrados por permisos; un grupo sin ítems visibles no aparece. */
export function groupMenuItems(items: MenuItem[]): MenuGroup[] {
  return GROUP_ORDER.map((id) => ({
    id,
    label: MENU_GROUP_LABELS[id],
    items: items.filter((item) => item.group === id),
  })).filter((group) => group.items.length > 0);
}
