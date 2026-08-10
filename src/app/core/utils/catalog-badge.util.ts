/**
 * Tokens semánticos válidos para `CatalogItem.color` (mismos del backend,
 * ver CATALOG_COLOR_TOKENS). Cada uno tiene una clase `-tint` definida en
 * styles/tokens.css.
 *
 * Las clases se listan de forma literal (no interpoladas) para que el
 * escaneo de contenido de Tailwind las detecte y genere el CSS.
 */
const BADGE_CLASSES_BY_TOKEN: Record<string, string> = {
  danger: 'bg-danger-tint text-danger',
  warning: 'bg-warning-tint text-warning',
  success: 'bg-success-tint text-success',
  info: 'bg-info-tint text-info',
  accent: 'bg-accent-tint text-accent',
  primary: 'bg-primary-tint text-primary',
};

/**
 * Devuelve las clases Tailwind de badge (fondo + texto) para el color
 * semántico de un CatalogItem. Si el color es null/desconocido, usa un
 * badge neutro.
 */
export function getCatalogBadgeClasses(color: string | null | undefined): string {
  if (color && BADGE_CLASSES_BY_TOKEN[color]) {
    return BADGE_CLASSES_BY_TOKEN[color];
  }
  return 'bg-surface-muted text-muted';
}
