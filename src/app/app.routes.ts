import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { platformAdminGuard } from './core/guards/platform-admin.guard';
import { chatbotFeatureGuard } from './core/guards/feature-flag.guard';
import { emailVerifiedGuard } from './core/guards/email-verified.guard';
import { twoFactorRequiredGuard } from './core/guards/two-factor-required.guard';
import { portalAuthGuard } from './core/guards/portal-auth.guard';
import { MainLayoutComponent } from './layout/main-layout.component';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { PortalLayoutComponent } from './layout/portal-layout.component';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'login',
	},
	{
		path: 'login',
		loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
	},
	{
		path: 'registro',
		loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
	},
	{
		path: 'recuperar',
		loadComponent: () =>
			import('./features/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
	},
	{
		path: 'restablecer',
		loadComponent: () =>
			import('./features/auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
	},
	{
		path: 'olvide-2fa',
		loadComponent: () =>
			import('./features/auth/forgot-two-factor/forgot-two-factor.component').then(
				(m) => m.ForgotTwoFactorComponent,
			),
	},
	{
		path: 'activar-cuenta',
		loadComponent: () =>
			import('./features/auth/activar-cuenta/activar-cuenta.component').then((m) => m.ActivarCuentaComponent),
	},
	{
		path: 'verificar-correo',
		loadComponent: () =>
			import('./features/auth/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent),
	},
	{
		path: 'verificar-pendiente',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./features/auth/verify-required/verify-required.component').then((m) => m.VerifyRequiredComponent),
	},
	{
		path: 'activar-2fa',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./features/auth/two-factor-required/two-factor-required.component').then(
				(m) => m.TwoFactorRequiredComponent,
			),
	},
	{
		path: 'admin/login',
		loadComponent: () => import('./features/admin/login/admin-login.component').then((m) => m.AdminLoginComponent),
	},
	{
		path: 'admin',
		component: AdminLayoutComponent,
		canActivate: [platformAdminGuard],
		children: [
			{
				path: 'tenants',
				loadComponent: () =>
					import('./features/admin/tenants/admin-tenants.component').then((m) => m.AdminTenantsComponent),
			},
			{
				path: 'plans',
				loadComponent: () => import('./features/admin/plans/admin-plans.component').then((m) => m.AdminPlansComponent),
			},
			{
				path: 'metrics',
				loadComponent: () =>
					import('./features/admin/metrics/admin-metrics.component').then((m) => m.AdminMetricsComponent),
			},
			{
				path: 'team',
				loadComponent: () => import('./features/admin/team/admin-team.component').then((m) => m.AdminTeamComponent),
			},
			{
				path: 'notifications',
				loadComponent: () =>
					import('./features/admin/notifications/admin-notifications.component').then((m) => m.AdminNotificationsComponent),
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
				loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
			},
			{
				path: 'onboarding',
				loadComponent: () => import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
			},
			{
				path: 'perfil',
				loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
			},
			{
				path: 'notificaciones',
				loadComponent: () => import('./features/notifications/notifications.component').then((m) => m.NotificationsComponent),
			},
			{
				path: 'usuarios',
				loadComponent: () => import('./features/users/users.component').then((m) => m.UsersComponent),
			},
			{
				path: 'roles',
				loadComponent: () => import('./features/roles/roles.component').then((m) => m.RolesComponent),
			},
			{
				path: 'configuracion',
				loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent),
			},
			{
				path: 'asesores',
				loadComponent: () => import('./features/advisors/advisors.component').then((m) => m.AdvisorsComponent),
			},
			{
				path: 'clientes',
				loadComponent: () => import('./features/clients/clients.component').then((m) => m.ClientsComponent),
			},
			{
				path: 'procesos',
				loadComponent: () => import('./features/processes/processes.component').then((m) => m.ProcessesComponent),
			},
			{
				path: 'calendario',
				loadComponent: () => import('./features/calendar/calendar.component').then((m) => m.CalendarComponent),
			},
			{
				path: 'tareas',
				loadComponent: () => import('./features/tasks/tasks.component').then((m) => m.TasksComponent),
			},
			{
				path: 'documentos',
				loadComponent: () => import('./features/documents/documents.component').then((m) => m.DocumentsComponent),
			},
			{
				path: 'chatbot',
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
		loadComponent: () => import('./features/portal/login/portal-login.component').then((m) => m.PortalLoginComponent),
	},
	{
		path: 'portal/activar-cuenta',
		loadComponent: () =>
			import('./features/portal/activar-cuenta/portal-activar-cuenta.component').then(
				(m) => m.PortalActivarCuentaComponent,
			),
	},
	{
		path: 'portal/recuperar',
		loadComponent: () =>
			import('./features/portal/forgot-password/portal-forgot-password.component').then(
				(m) => m.PortalForgotPasswordComponent,
			),
	},
	{
		path: 'portal/restablecer',
		loadComponent: () =>
			import('./features/portal/reset-password/portal-reset-password.component').then(
				(m) => m.PortalResetPasswordComponent,
			),
	},
	{
		path: 'portal',
		component: PortalLayoutComponent,
		canActivate: [portalAuthGuard],
		children: [
			{
				path: 'procesos',
				loadComponent: () =>
					import('./features/portal/procesos/portal-procesos.component').then((m) => m.PortalProcesosComponent),
			},
			{
				path: 'procesos/:id',
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
