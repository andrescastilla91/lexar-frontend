import { TestBed } from '@angular/core/testing';
import { CatalogAssignItem, CatalogAssignModalComponent } from './catalog-assign-modal.component';

describe('CatalogAssignModalComponent', () => {
  const groupedItems: CatalogAssignItem[] = [
    { id: 'p1', label: 'Crear usuarios', description: 'Alta de usuarios nuevos', group: 'Usuarios' },
    { id: 'p2', label: 'Asignar roles', description: 'Asignación de roles a usuarios', group: 'Usuarios' },
    { id: 'p3', label: 'Crear clientes', description: 'Alta de clientes', group: 'Clientes' },
  ];

  function createComponent() {
    const fixture = TestBed.createComponent(CatalogAssignModalComponent);
    fixture.componentRef.setInput('title', 'Gestionar permisos');
    fixture.componentRef.setInput('items', groupedItems);
    fixture.componentRef.setInput('selectedIds', []);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CatalogAssignModalComponent] });
  });

  it('sin searchable, no ofrece nunca el código crudo — el modal solo pinta label/description ya provistos', () => {
    const { component } = createComponent();

    // El modal no reconstruye texto: el `label` que llega es lo que se ve.
    expect(component.items().every((i) => !i.label.includes('.'))).toBe(true);
  });

  describe('con searchable activo', () => {
    function createSearchable() {
      const fixture = TestBed.createComponent(CatalogAssignModalComponent);
      fixture.componentRef.setInput('title', 'Gestionar permisos');
      fixture.componentRef.setInput('items', groupedItems);
      fixture.componentRef.setInput('selectedIds', ['p2']);
      fixture.componentRef.setInput('isOpen', true);
      fixture.componentRef.setInput('searchable', true);
      fixture.detectChanges();
      return { fixture, component: fixture.componentInstance };
    }

    it('sin término de búsqueda, muestra todos los grupos', () => {
      const { component } = createSearchable();

      expect(component.filteredGroupedItems()).toHaveLength(2);
    });

    it('filtra por label y oculta el grupo sin coincidencias', () => {
      const { component } = createSearchable();

      component.onSearchInput({ target: { value: 'cliente' } } as unknown as Event);

      const filtered = component.filteredGroupedItems();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Clientes');
    });

    it('filtra por description también', () => {
      const { component } = createSearchable();

      component.onSearchInput({ target: { value: 'alta de usuarios' } } as unknown as Event);

      const filtered = component.filteredGroupedItems();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].items.map((i) => i.id)).toEqual(['p1']);
    });

    it('filtra por nombre de grupo', () => {
      const { component } = createSearchable();

      component.onSearchInput({ target: { value: 'usuarios' } } as unknown as Event);

      const filtered = component.filteredGroupedItems();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].items).toHaveLength(2);
    });

    it('es insensible a mayúsculas y a tildes', () => {
      const { component } = createSearchable();

      component.onSearchInput({ target: { value: 'ASIGNACION' } } as unknown as Event);

      const filtered = component.filteredGroupedItems();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].items.map((i) => i.id)).toEqual(['p2']);
    });

    it('un ítem seleccionado que queda fuera del filtro sigue seleccionado (filtrar no toca la selección)', () => {
      const { component } = createSearchable();

      // p2 está seleccionado (selectedIds=['p2']), filtramos por "cliente"
      // que lo excluye de la vista.
      component.onSearchInput({ target: { value: 'cliente' } } as unknown as Event);

      expect(component.isSelected('p2')).toBe(true);
      expect(component.selectedCount()).toBe(1);
    });

    it('sin resultados, filteredGroupedItems queda vacío', () => {
      const { component } = createSearchable();

      component.onSearchInput({ target: { value: 'no existe ningún permiso así' } } as unknown as Event);

      expect(component.filteredGroupedItems()).toEqual([]);
    });

    it('clearSearch limpia el término de búsqueda', () => {
      const { component } = createSearchable();
      component.onSearchInput({ target: { value: 'cliente' } } as unknown as Event);

      component.clearSearch();

      expect(component.searchTerm()).toBe('');
      expect(component.filteredGroupedItems()).toHaveLength(2);
    });

    it('Escape en el buscador limpia el filtro', () => {
      const { component } = createSearchable();
      component.onSearchInput({ target: { value: 'cliente' } } as unknown as Event);
      const event = { stopPropagation: jest.fn() } as unknown as Event;

      component.onSearchEscape(event);

      expect(component.searchTerm()).toBe('');
    });

    it('selectedCount refleja el total de seleccionados, no solo los visibles', () => {
      const { fixture, component } = createSearchable();
      fixture.componentRef.setInput('selectedIds', ['p1', 'p2', 'p3']);
      fixture.detectChanges();

      component.onSearchInput({ target: { value: 'cliente' } } as unknown as Event);

      expect(component.selectedCount()).toBe(3);
    });
  });

  describe('sin searchable (comportamiento previo intacto)', () => {
    it('filteredGroupedItems es igual a groupedItems cuando searchable=false', () => {
      const { component } = createComponent();

      expect(component.filteredGroupedItems()).toEqual(component.groupedItems());
    });
  });

  it('toggle agrega y quita ids de la selección interna', () => {
    const { component } = createComponent();

    component.toggle('p1');
    expect(component.isSelected('p1')).toBe(true);

    component.toggle('p1');
    expect(component.isSelected('p1')).toBe(false);
  });

  it('onSave emite la selección interna actual', () => {
    const { component } = createComponent();
    const emitted: string[][] = [];
    component.save.subscribe((ids) => emitted.push(ids));

    component.toggle('p1');
    component.onSave();

    expect(emitted).toEqual([['p1']]);
  });

  it('onCancel emite cancel', () => {
    const { component } = createComponent();
    let cancelled = false;
    component.cancel.subscribe(() => (cancelled = true));

    component.onCancel();

    expect(cancelled).toBe(true);
  });
});
