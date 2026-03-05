import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit, effect, Injector } from '@angular/core';
import { PermissionsService } from '../services/permissions.service';

@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnInit {
  private readonly templateRef = inject(TemplateRef<any>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permissionsService = inject(PermissionsService);
  private readonly injector = inject(Injector);
  
  private hasView = false;
  private currentPermissions: string | string[] = [];

  @Input() set hasPermission(permission: string | string[]) {
    this.currentPermissions = permission;
    this.updateView();
  }

  ngOnInit(): void {
    // Crear effect dentro del contexto de inyección
    effect(() => {
      // Forzar re-evaluación cuando cambien los permisos del usuario
      this.permissionsService.userPermissions();
      this.updateView();
    }, { injector: this.injector });
  }

  private updateView(): void {
    const permissions = Array.isArray(this.currentPermissions) 
      ? this.currentPermissions 
      : [this.currentPermissions];
    
    const hasPermission = this.permissionsService.hasAnyPermission(permissions);

    if (hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
