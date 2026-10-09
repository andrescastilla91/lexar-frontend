import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-audit-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex flex-wrap gap-1 border-b border-default" aria-label="Secciones de auditoría">
      @for (tab of tabs; track tab.route) {
        <a
          [routerLink]="tab.route"
          routerLinkActive
          #link="routerLinkActive"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          class="rounded-t-md px-4 py-2 text-sm font-medium transition"
          [class]="link.isActive ? 'border-b-2 border-navy-900 text-navy-900' : 'text-subtle hover:text-muted'"
        >
          {{ tab.label }}
        </a>
      }
    </nav>
  `,
})
export class AuditTabsComponent {
  readonly tabs = [
    { route: '/auditoria', label: 'Actividad' },
    { route: '/auditoria/aceptaciones', label: 'Aceptaciones de términos' },
    { route: '/auditoria/autorizaciones', label: 'Autorizaciones de clientes' },
  ];
}
