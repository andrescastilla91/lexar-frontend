import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HasPermissionDirective } from './has-permission.directive';
import { PermissionsService } from '../services/permissions.service';

@Component({
  standalone: true,
  imports: [HasPermissionDirective],
  template: `<div *hasPermission="permission" class="protected">Contenido protegido</div>`,
})
class SinglePermissionHostComponent {
  permission: string | string[] = 'clients.view';
}

@Component({
  standalone: true,
  imports: [HasPermissionDirective],
  template: `<div *hasPermission="permissions" class="protected">Contenido protegido</div>`,
})
class MultiplePermissionHostComponent {
  permissions: string[] = ['clients.view', 'clients.edit'];
}

describe('HasPermissionDirective', () => {
  function configurePermissions(userPermissions: string[]) {
    const permissionsSignal = signal(userPermissions);
    const hasAnyPermission = jest.fn((perms: string[]) => perms.some((p) => permissionsSignal().includes(p)));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission,
            userPermissions: permissionsSignal,
          },
        },
      ],
    });

    return { permissionsSignal, hasAnyPermission };
  }

  it('crea la vista embebida cuando el usuario tiene el permiso requerido', () => {
    configurePermissions(['clients.view']);

    const fixture = TestBed.createComponent(SinglePermissionHostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.protected')).not.toBeNull();
  });

  it('no crea la vista embebida cuando el usuario no tiene el permiso', () => {
    configurePermissions([]);

    const fixture = TestBed.createComponent(SinglePermissionHostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();
  });

  it('acepta un arreglo de permisos y usa hasAnyPermission con todos ellos', () => {
    const { hasAnyPermission } = configurePermissions(['clients.edit']);

    const fixture = TestBed.createComponent(MultiplePermissionHostComponent);
    fixture.detectChanges();

    expect(hasAnyPermission).toHaveBeenCalledWith(['clients.view', 'clients.edit']);
    expect(fixture.nativeElement.querySelector('.protected')).not.toBeNull();
  });

  it('con un arreglo de permisos, si ninguno coincide no crea la vista', () => {
    configurePermissions(['tasks.view']);

    const fixture = TestBed.createComponent(MultiplePermissionHostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();
  });

  it('reacciona cuando el input hasPermission cambia a otro valor', () => {
    configurePermissions(['clients.delete']);

    const fixture = TestBed.createComponent(SinglePermissionHostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();

    fixture.componentInstance.permission = 'clients.delete';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.protected')).not.toBeNull();
  });

  it('reacciona cuando el signal userPermissions del servicio cambia (effect)', () => {
    const { permissionsSignal } = configurePermissions([]);

    const fixture = TestBed.createComponent(SinglePermissionHostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();

    permissionsSignal.set(['clients.view']);
    TestBed.tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.protected')).not.toBeNull();
  });

  it('limpia la vista embebida cuando el usuario pierde el permiso (effect)', () => {
    const { permissionsSignal } = configurePermissions(['clients.view']);

    const fixture = TestBed.createComponent(SinglePermissionHostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected')).not.toBeNull();

    permissionsSignal.set([]);
    TestBed.tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.protected')).toBeNull();
  });

  it('no vuelve a crear la vista si ya estaba creada y el permiso sigue vigente', () => {
    configurePermissions(['clients.view']);

    const fixture = TestBed.createComponent(SinglePermissionHostComponent);
    fixture.detectChanges();
    const firstElement = fixture.nativeElement.querySelector('.protected');

    TestBed.tick();
    fixture.detectChanges();
    const secondElement = fixture.nativeElement.querySelector('.protected');

    expect(firstElement).toBe(secondElement);
  });
});
