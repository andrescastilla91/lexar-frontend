import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { platformAdminGuard } from './core/guards/platform-admin.guard';
import { chatbotFeatureGuard } from './core/guards/feature-flag.guard';
import { emailVerifiedGuard } from './core/guards/email-verified.guard';
import { ownerOnlyGuard } from './core/guards/owner-only.guard';
import { twoFactorRequiredGuard } from './core/guards/two-factor-required.guard';
import { portalAuthGuard } from './core/guards/portal-auth.guard';
import { MainLayoutComponent } from './layout/main-layout.component';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { PortalLayoutComponent } from './layout/portal-layout.component';
import { environment } from '../environments/environment';

// F29(b): título de pestaña por ruta. Cada ruta declara solo su nombre de
// sección corto (`title: 'Tablero'`) — la concatenación con la marca
// ("Tablero · LexAr") la hace `LexArTitleStrategy`
// (core/services/lexar-title-strategy.ts), que reemplaza al
// `DefaultTitleStrategy` de Angular (registrado en `app.config.ts`) y lee
// el nombre de marca de `environment.brandName`. Así, un rename de marca
// solo toca ese valor — no estas ~30 rutas (ajuste 2026-09-03, ver ficha).
//
// `data: { titleSuffix }` cambia el sufijo por defecto ("app" → el nombre
// de marca solo) cuando la sección no es la app principal: 'portal' →
// "Portal <marca>", 'admin' → "Panel <marca>", 'literal' → usar el `title`
// tal cual, sin concatenar nada (el único caso: login, que usa el claim de
// marca completo). Declararlo en la ruta padre (`admin`, `portal`) alcanza
// para todos sus hijos — `LexArTitleStrategy` recorre la cadena completa.
//
// Una ruta sin `title` no rompe nada: el router simplemente conserva el
// título anterior (o el de `index.html` en la primera carga).
export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'login',
	},
	{
		path: 'login',
		title: `${environment.brandName} — Gestión legal`,
		data: { titleSuffix: 'literal' },
		loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
	},
	{
		path: 'registro',
		title: 'Crear cuenta',
		loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
	},
	{
		path: 'recuperar',
		title: 'Recuperar contraseña',
		loadComponent: () =>
			import('./features/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
	},
	{
		path: 'restablecer',
		title: 'Restablecer contraseña',
		loadComponent: () =>
			import('./features/auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
	},
	{
		path: 'olvide-2fa',
		title: 'Recuperar acceso 2FA',
		loadComponent: () =>
			import('./features/auth/forgot-two-factor/forgot-two-factor.component').then(
				(m) => m.ForgotTwoFactorComponent,
			),
	},
	{
		path: 'activar-cuenta',
		title: 'Activar cuenta',
		loadComponent: () =>
			import('./features/auth/activar-cuenta/activar-cuenta.component').then((m) => m.ActivarCuentaComponent),
	},
	{
		path: 'verificar-correo',
		title: 'Verificar correo',
		loadComponent: () =>
			import('./features/auth/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent),
	},
	{
		path: 'verificar-pendiente',
		title: 'Verificación pendiente',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./features/auth/verify-required/verify-required.component').then((m) => m.VerifyRequiredComponent),
	},
	{
		path: 'activar-2fa',
		title: 'Activar verificación en dos pasos',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./features/auth/two-factor-required/two-factor-required.component').then(
				(m) => m.TwoFactorRequiredComponent,
			),
	},
	{
		path: 'admin/login',
		title: 'Acceso administrador',
		data: { titleSuffix: 'admin' },
		loadComponent: () => import('./features/admin/login/admin-login.component').then((m) => m.AdminLoginComponent),
	},
	{
		path: 'admin',
		component: AdminLayoutComponent,
		canActivate: [platformAdminGuard],
		data: { titleSuffix: 'admin' },
		children: [
			{
				path: 'tenants',
				title: 'Empresas',
				loadComponent: () =>
					import('./features/admin/tenants/admin-tenants.component').then((m) => m.AdminTenantsComponent),
			},
			{
				path: 'plans',
				title: 'Planes',
				loadComponent: () => import('./features/admin/plans/admin-plans.component').then((m) => m.AdminPlansComponent),
			},
			{
				path: 'metrics',
				title: 'Métricas',
				loadComponent: () =>
					import('./features/admin/metrics/admin-metrics.component').then((m) => m.AdminMetricsComponent),
			},
			{
				path: 'team',
				title: 'Equipo',
				loadComponent: () => import('./features/admin/team/admin-team.component').then((m) => m.AdminTeamComponent),
			},
			{
				path: 'notifications',
				title: 'Notificaciones',
				loadComponent: () =>
					import('./features/admin/notifications/admin-notifications.component').then((m) => m.AdminNotificationsComponent),
			},
			{
				path: 'permissions',
				title: 'Permisos',
				loadComponent: () =>
					import('./features/admin/permissions/admin-permissions.component').then((m) => m.AdminPermissionsComponent),
			},
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'tenants',
			},
		],
	},
	{
		path: '',
		component: MainLayoutComponent,
		canActivate: [authGuard, emailVerifiedGuard, twoFactorRequiredGuard],
		children: [
			{
				path: 'dashboard',
				title: 'Tablero',
				loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
			},
			{
				// BUG-11: el checklist/wizard de "Primeros pasos" solo aplica al
				// dueño de la empresa — ownerOnlyGuard cierra el acceso directo
				// por URL (espejo de la restricción ya aplicada en el backend,
				// DashboardService.getOnboardingChecklist).
				path: 'onboarding',
				title: 'Primeros pasos',
				canActivate: [ownerOnlyGuard],
				loadComponent: () => import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
			},
			{
				path: 'perfil',
				title: 'Mi perfil',
				loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
			},
			{
				path: 'notificaciones',
				title: 'Notificaciones',
				loadComponent: () => import('./features/notifications/notifications.component').then((m) => m.NotificationsComponent),
			},
			{
				path: 'usuarios',
				title: 'Usuarios',
				loadComponent: () => import('./features/users/users.component').then((m) => m.UsersComponent),
			},
			{
				path: 'roles',
				title: 'Roles',
				loadComponent: () => import('./features/roles/roles.component').then((m) => m.RolesComponent),
			},
			{
				path: 'configuracion',
				title: 'Configuración',
				loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent),
			},
			{
				path: 'asesores',
				title: 'Asesores',
				loadComponent: () => import('./features/advisors/advisors.component').then((m) => m.AdvisorsComponent),
			},
			{
				path: 'clientes',
				title: 'Clientes',
				loadComponent: () => import('./features/clients/clients.component').then((m) => m.ClientsComponent),
			},
			{
				path: 'procesos',
				title: 'Procesos',
				loadComponent: () => import('./features/processes/processes.component').then((m) => m.ProcessesComponent),
			},
			{
				path: 'calendario',
				title: 'Calendario',
				loadComponent: () => import('./features/calendar/calendar.component').then((m) => m.CalendarComponent),
			},
			{
				path: 'tareas',
				title: 'Tareas',
				loadComponent: () => import('./features/tasks/tasks.component').then((m) => m.TasksComponent),
			},
			{
				path: 'documentos',
				title: 'Documentos',
				loadComponent: () => import('./features/documents/documents.component').then((m) => m.DocumentsComponent),
			},
			{
				path: 'chatbot',
				title: 'Asistente',
				canActivate: [chatbotFeatureGuard],
				loadComponent: () => import('./features/chatbot/chatbot.component').then((m) => m.ChatbotComponent),
			},
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'dashboard',
			},
		],
	},
	// F16: portal del cliente — actor y layout completamente separados del
	{
		path: 'portal/login',
		title: 'Portal del cliente',
		data: { titleSuffix: 'portal' },
		loadComponent: () => import('./features/portal/login/portal-login.component').then((m) => m.PortalLoginComponent),
	},
	{
		path: 'portal/activar-cuenta',
		title: 'Activar cuenta',
		data: { titleSuffix: 'portal' },
		loadComponent: () =>
			import('./features/portal/activar-cuenta/portal-activar-cuenta.component').then(
				(m) => m.PortalActivarCuentaComponent,
			),
	},
	{
		path: 'portal/recuperar',
		title: 'Recuperar contraseña',
		data: { titleSuffix: 'portal' },
		loadComponent: () =>
			import('./features/portal/forgot-password/portal-forgot-password.component').then(
				(m) => m.PortalForgotPasswordComponent,
			),
	},
	{
		path: 'portal/restablecer',
		title: 'Restablecer contraseña',
		data: { titleSuffix: 'portal' },
		loadComponent: () =>
			import('./features/portal/reset-password/portal-reset-password.component').then(
				(m) => m.PortalResetPasswordComponent,
			),
	},
	{
		path: 'portal',
		component: PortalLayoutComponent,
		canActivate: [portalAuthGuard],
		data: { titleSuffix: 'portal' },
		children: [
			{
				path: 'procesos',
				title: 'Mis procesos',
				loadComponent: () =>
					import('./features/portal/procesos/portal-procesos.component').then((m) => m.PortalProcesosComponent),
			},
			{
				// F29: sin datos del registro en el título (fuera de alcance) —
				// se mantiene genérico, igual que el listado.
				path: 'procesos/:id',
				title: 'Detalle del proceso',
				loadComponent: () =>
					import('./features/portal/proceso-detalle/portal-proceso-detalle.component').then(
						(m) => m.PortalProcesoDetalleComponent,
					),
			},
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'procesos',
			},
		],
	},
	{
		path: '**',
		redirectTo: 'dashboard',
	},
];
