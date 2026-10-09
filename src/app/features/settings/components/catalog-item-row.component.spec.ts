import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PermissionsService } from '../../../core/services/permissions.service';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import { CatalogItemRowComponent } from './catalog-item-row.component';

const baseItem: CatalogItem = {
  id: '1',
  catalogType: 'document_type',
  code: 'CONTRATO',
  label: 'Contrato',
  color: 'primary',
  sortOrder: 0,
  isActive: true,
  isSystem: false,
  personTypeScope: null,
  processTypeScope: null,
  usageCount: 0,
};

@Component({
  standalone: true,
  imports: [CatalogItemRowComponent],
  template: `<div
    app-catalog-item-row
    [item]="item()"
    [isFirst]="isFirst()"
    [isLast]="isLast()"
    (move)="events.push('move:' + $event)"
    (edit)="events.push('edit')"
    (toggle)="events.push('toggle')"
    (remove)="events.push('remove')"
  ></div>`,
})
class HostComponent {
  readonly item = signal<CatalogItem>(baseItem);
  readonly isFirst = signal(false);
  readonly isLast = signal(false);
  readonly events: string[] = [];
}

describe('CatalogItemRowComponent', () => {
  function create(canManage = true) {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(canManage),
            hasPermission: jest.fn().mockReturnValue(canManage),
            userPermissions: signal<string[]>([]),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = (name: string) =>
      Array.from(root.querySelectorAll('button')).find((b) => (b.textContent ?? '').trim() === name || b.title === name);
    return { fixture, root, host: fixture.componentInstance, button };
  }

  it('muestra etiqueta, código y marcas de sistema/inactivo', () => {
    const { fixture, root, host } = create();
    host.item.set({ ...baseItem, isSystem: true, isActive: false });
    fixture.detectChanges();

    const text = root.textContent ?? '';
    expect(text).toContain('Contrato');
    expect(text).toContain('CONTRATO');
    expect(text).toContain('Sistema');
    expect(text).toContain('Inactivo');
  });

  it('emite editar, activar/desactivar y eliminar', () => {
    const { fixture, host, button } = create();

    button('Editar')?.click();
    button('Desactivar')?.click();
    button('Eliminar')?.click();
    fixture.detectChanges();

    expect(host.events).toEqual(['edit', 'toggle', 'remove']);
  });

  it('emite el movimiento hacia arriba y hacia abajo', () => {
    const { host, button } = create();

    button('Subir')?.click();
    button('Bajar')?.click();

    expect(host.events).toEqual(['move:-1', 'move:1']);
  });

  it('deshabilita subir en el primero y bajar en el último', () => {
    const { fixture, host, button } = create();
    host.isFirst.set(true);
    host.isLast.set(true);
    fixture.detectChanges();

    expect((button('Subir') as HTMLButtonElement).disabled).toBe(true);
    expect((button('Bajar') as HTMLButtonElement).disabled).toBe(true);
  });

  it('un ítem del sistema no ofrece Eliminar; uno en uso lo deshabilita', () => {
    const { fixture, host, button } = create();

    host.item.set({ ...baseItem, isSystem: true });
    fixture.detectChanges();
    expect(button('Eliminar')).toBeUndefined();

    host.item.set({ ...baseItem, usageCount: 3 });
    fixture.detectChanges();
    expect((button('Eliminar') as HTMLButtonElement).disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Usado en 3 registro(s)');
  });

  it('sin catalogs.manage no hay acciones de edición', () => {
    const { root } = create(false);

    expect(root.querySelectorAll('button')).toHaveLength(0);
  });

  it('el host es un div hijo directo de la lista (los e2e dependen de eso)', () => {
    const { root } = create();

    expect(root.querySelector('div[app-catalog-item-row]')).not.toBeNull();
  });
});
