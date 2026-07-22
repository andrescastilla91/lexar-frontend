import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { chatbotFeatureGuard } from './core/guards/feature-flag.guard';
import { MainLayoutComponent } from './layout/main-layout.component';

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
		path: 'activar-cuenta',
		loadComponent: () =>
			import('./features/auth/activar-cuenta/activar-cuenta.component').then((m) => m.ActivarCuentaComponent),
	},
	{
		path: '',
		component: MainLayoutComponent,
		canActivate: [authGuard],
		children: [
			{
				path: 'dashboard',
				loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
			},
			{
				path: 'perfil',
				loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
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
	{
		path: '**',
		redirectTo: 'dashboard',
	},
];
