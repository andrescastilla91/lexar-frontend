import { TestBed } from '@angular/core/testing';
import { MultiSelectComponent, MultiSelectItem } from './multi-select.component';

describe('MultiSelectComponent (BUG-06 etapa 1)', () => {
  const items: MultiSelectItem[] = [
    { id: 'a1', label: 'Ana García', description: 'Civil' },
    { id: 'a2', label: 'Carlos Pérez', description: 'Laboral' },
    { id: 'a3', label: 'Lucía Restrepo', description: 'Penal' },
  ];

  function createComponent(selectedIds: string[] = []) {
    const fixture = TestBed.createComponent(MultiSelectComponent);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('selectedIds', selectedIds);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MultiSelectComponent],
    });
  });

  it('muestra todos los items cuando no hay término de búsqueda', () => {
    const { component } = createComponent();
    expect(component.filteredItems()).toHaveLength(3);
  });

  it('filtra por título sin distinguir mayúsculas ni acentos', () => {
    const { component } = createComponent();

    component.onSearchInput('lucia');

    expect(component.filteredItems()).toEqual([items[2]]);
  });

  it('filtra también por descripción', () => {
    const { component } = createComponent();

    component.onSearchInput('laboral');

    expect(component.filteredItems()).toEqual([items[1]]);
  });

  it('sin coincidencias, filteredItems queda vacío (estado vacío)', () => {
    const { component, fixture } = createComponent();

    // onSearchInput abre la lista como efecto secundario (ver describe
    // "desplegable"), así que el estado vacío queda visible en el DOM.
    component.onSearchInput('no existe');
    fixture.detectChanges();

    expect(component.filteredItems()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Sin resultados');
  });

  it('toggle selecciona y deselecciona, y emite selectionChange', () => {
    const { component } = createComponent();
    const emitted: string[][] = [];
    component.selectionChange.subscribe((ids) => emitted.push(ids));

    component.toggle('a1');
    expect(component.isSelected('a1')).toBe(true);
    expect(emitted).toEqual([['a1']]);

    component.toggle('a1');
    expect(component.isSelected('a1')).toBe(false);
    expect(emitted).toEqual([['a1'], []]);
  });

  it('los seleccionados que quedan fuera del filtro no se pierden', () => {
    const { component } = createComponent(['a1']);

    component.onSearchInput('laboral');

    expect(component.filteredItems()).toEqual([items[1]]);
    expect(component.isSelected('a1')).toBe(true);
    expect(component.selectedItems()).toEqual([items[0]]);
  });

  it('removeChip quita la selección (mismo efecto que destildar)', () => {
    const { component } = createComponent(['a1', 'a2']);

    component.removeChip('a1');

    expect(component.isSelected('a1')).toBe(false);
    expect(component.isSelected('a2')).toBe(true);
  });

  it('sincroniza la selección interna cuando selectedIds cambia desde el consumidor', () => {
    const { component, fixture } = createComponent(['a1']);
    expect(component.isSelected('a1')).toBe(true);

    fixture.componentRef.setInput('selectedIds', ['a2']);
    fixture.detectChanges();

    expect(component.isSelected('a1')).toBe(false);
    expect(component.isSelected('a2')).toBe(true);
  });

  // Elevado a scope de módulo (antes vivía solo dentro de 'teclado') porque
  // el describe 'desplegable' agregado en el ajuste de UX del 2026-09-03
  // también necesita simular Escape.
  function key(type: string): KeyboardEvent {
    return new KeyboardEvent('keydown', { key: type, cancelable: true });
  }

  describe('teclado', () => {
    it('ArrowDown/ArrowUp mueven el índice resaltado dentro de los límites', () => {
      const { component } = createComponent();

      component.onSearchKeydown(key('ArrowDown'));
      expect(component.highlightedIndex()).toBe(0);

      component.onSearchKeydown(key('ArrowDown'));
      expect(component.highlightedIndex()).toBe(1);

      component.onSearchKeydown(key('ArrowUp'));
      expect(component.highlightedIndex()).toBe(0);

      component.onSearchKeydown(key('ArrowUp'));
      expect(component.highlightedIndex()).toBe(0);
    });

    it('Enter selecciona el item resaltado', () => {
      const { component } = createComponent();

      component.onSearchKeydown(key('ArrowDown'));
      component.onSearchKeydown(key('Enter'));

      expect(component.isSelected('a1')).toBe(true);
    });

    it('Escape limpia el término de búsqueda', () => {
      const { component } = createComponent();
      component.onSearchInput('ana');
      expect(component.searchTerm()).toBe('ana');

      component.onSearchKeydown(key('Escape'));

      expect(component.searchTerm()).toBe('');
    });

    it('Backspace con el filtro vacío quita el último chip seleccionado', () => {
      const { component } = createComponent(['a1', 'a2']);

      component.onSearchKeydown(key('Backspace'));

      expect(component.isSelected('a2')).toBe(false);
      expect(component.isSelected('a1')).toBe(true);
    });

    it('Backspace con texto en el filtro no toca la selección', () => {
      const { component } = createComponent(['a1']);
      component.onSearchInput('a');

      component.onSearchKeydown(key('Backspace'));

      expect(component.isSelected('a1')).toBe(true);
    });
  });

  // Ajuste 2026-09-03: la lista de opciones dejó de estar siempre visible —
  // se comporta como un <select> nativo (cerrada por defecto, se abre al
  // enfocar/hacer clic, se cierra afuera/Escape/al perder el foco).
  describe('desplegable (comportamiento tipo select)', () => {
    it('arranca cerrado: no renderiza el listbox aunque haya items', () => {
      const { component, fixture } = createComponent();
      fixture.detectChanges();

      expect(component.isOpen()).toBe(false);
      expect(fixture.nativeElement.querySelector('ul[role="listbox"]')).toBeNull();
    });

    it('open() despliega la lista y close() la oculta', () => {
      const { component, fixture } = createComponent();

      component.open();
      fixture.detectChanges();
      expect(component.isOpen()).toBe(true);
      expect(fixture.nativeElement.querySelector('ul[role="listbox"]')).not.toBeNull();

      component.close();
      fixture.detectChanges();
      expect(component.isOpen()).toBe(false);
      expect(fixture.nativeElement.querySelector('ul[role="listbox"]')).toBeNull();
    });

    it('open() no hace nada si el componente está disabled', () => {
      const { component, fixture } = createComponent();
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      component.open();

      expect(component.isOpen()).toBe(false);
    });

    it('onSearchInput abre la lista automáticamente (empezar a escribir despliega, como un select con búsqueda)', () => {
      const { component } = createComponent();

      component.onSearchInput('ana');

      expect(component.isOpen()).toBe(true);
    });

    it('onDocumentClick cierra la lista si el clic fue fuera del componente', () => {
      const { component, fixture } = createComponent();
      component.open();
      fixture.detectChanges();

      const outsideElement = document.createElement('div');
      component.onDocumentClick({ target: outsideElement } as unknown as MouseEvent);

      expect(component.isOpen()).toBe(false);
    });

    it('onDocumentClick NO cierra la lista si el clic fue dentro del componente (ej. un checkbox de la lista)', () => {
      const { component, fixture } = createComponent();
      component.open();
      fixture.detectChanges();

      const insideElement: HTMLElement = fixture.nativeElement.querySelector('input[type="checkbox"]');
      component.onDocumentClick({ target: insideElement } as unknown as MouseEvent);

      expect(component.isOpen()).toBe(true);
    });

    it('onFocusOut cierra la lista si el nuevo foco sale del componente', () => {
      const { component, fixture } = createComponent();
      component.open();
      fixture.detectChanges();

      const outsideElement = document.createElement('div');
      component.onFocusOut({ relatedTarget: outsideElement } as unknown as FocusEvent);

      expect(component.isOpen()).toBe(false);
    });

    it('onFocusOut NO cierra la lista si el nuevo foco sigue dentro del componente', () => {
      const { component, fixture } = createComponent();
      component.open();
      fixture.detectChanges();

      const insideElement: HTMLElement = fixture.nativeElement.querySelector('input[type="checkbox"]');
      component.onFocusOut({ relatedTarget: insideElement } as unknown as FocusEvent);

      expect(component.isOpen()).toBe(true);
    });

    it('Escape cierra la lista cuando el filtro ya está vacío (una segunda vez, tras limpiar el término)', () => {
      const { component } = createComponent();
      component.onSearchInput('ana');
      expect(component.isOpen()).toBe(true);

      component.onSearchKeydown(key('Escape')); // 1a vez: limpia el término
      expect(component.searchTerm()).toBe('');
      expect(component.isOpen()).toBe(true);

      component.onSearchKeydown(key('Escape')); // 2a vez: cierra la lista
      expect(component.isOpen()).toBe(false);
    });
  });
});
