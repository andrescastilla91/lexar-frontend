import { CatalogSummaryItem, CatalogType } from '../../../core/models/catalog-backend.model';
import {
  CATALOG_GROUPS,
  CATALOG_META,
  DEFAULT_CATALOG_TYPE,
  buildCatalogNav,
  isCatalogType,
} from './catalog-registry';

describe('catalog-registry (F47)', () => {
  const summary: CatalogSummaryItem[] = [
    { catalogType: 'document_type', total: 6, active: 5 },
    { catalogType: 'process_type', total: 3, active: 3 },
  ];

  it('cada catálogo pertenece a un grupo que existe y tiene etiqueta y descripción', () => {
    const groupIds = CATALOG_GROUPS.map((group) => group.id);
    for (const [type, meta] of Object.entries(CATALOG_META)) {
      expect(groupIds).toContain(meta.group);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(isCatalogType(type)).toBe(true);
    }
  });

  it('las etiquetas no se repiten (dos catálogos no pueden llamarse igual en la navegación)', () => {
    const labels = Object.values(CATALOG_META).map((meta) => meta.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('el catálogo por defecto existe', () => {
    expect(isCatalogType(DEFAULT_CATALOG_TYPE)).toBe(true);
  });

  it('isCatalogType rechaza valores desconocidos, vacíos y propiedades heredadas', () => {
    expect(isCatalogType('no_existe')).toBe(false);
    expect(isCatalogType('')).toBe(false);
    expect(isCatalogType(null)).toBe(false);
    expect(isCatalogType('constructor')).toBe(false);
  });

  describe('buildCatalogNav', () => {
    it('agrupa en el orden de CATALOG_GROUPS y cubre todos los catálogos', () => {
      const groups = buildCatalogNav(summary);

      expect(groups.map((group) => group.id)).toEqual(CATALOG_GROUPS.map((group) => group.id));
      const types = groups.flatMap((group) => group.entries.map((entry) => entry.type));
      expect(types.sort()).toEqual((Object.keys(CATALOG_META) as CatalogType[]).sort());
    });

    it('trae el conteo de activos y 0 para los tipos sin ítems', () => {
      const entries = buildCatalogNav(summary).flatMap((group) => group.entries);

      expect(entries.find((entry) => entry.type === 'document_type')?.activeCount).toBe(5);
      expect(entries.find((entry) => entry.type === 'contingency')?.activeCount).toBe(0);
    });

    it('sin resumen (cargando o con error) los conteos son null, no 0', () => {
      const entries = buildCatalogNav(null).flatMap((group) => group.entries);

      expect(entries.every((entry) => entry.activeCount === null)).toBe(true);
    });

    it('filtra por nombre ignorando mayúsculas y tildes, y descarta los grupos vacíos', () => {
      const groups = buildCatalogNav(summary, 'CONTINGENCIA');

      expect(groups).toHaveLength(1);
      expect(groups[0].entries.map((entry) => entry.type)).toEqual(['contingency']);
      expect(buildCatalogNav(summary, 'vinculacion').flatMap((g) => g.entries.map((e) => e.type))).toEqual([
        'contract_type',
      ]);
    });

    it('buscar por el nombre de un grupo trae todos sus catálogos', () => {
      const groups = buildCatalogNav(summary, 'procesos');

      expect(groups.map((group) => group.id)).toContain('processes');
      expect(groups.find((group) => group.id === 'processes')?.entries).toHaveLength(3);
    });

    it('un texto sin coincidencias devuelve una lista vacía', () => {
      expect(buildCatalogNav(summary, 'zzzz')).toEqual([]);
    });
  });
});
