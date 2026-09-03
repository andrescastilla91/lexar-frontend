/** F32 PR2 — catálogo de 3 capas de widgets del dashboard (ver docs/05-features/F32-dashboard-widgets-configurable.md). */

export interface DashboardWidgetCatalogItem {
  key: string;
  title: string;
  description: string;
}

export interface DashboardWidgetsResponse {
  message: string;
  /** Widgets disponibles para el usuario actual (definición ∩ plataforma ∩ empresa). */
  catalog: DashboardWidgetCatalogItem[];
  /** Orden efectivo a renderizar: layout guardado del usuario, o el default de la empresa si nunca personalizó. */
  layout: string[];
}

export interface SaveDashboardLayoutResponse {
  message: string;
  layout: string[];
}

export interface DashboardWidgetCompanySetting {
  key: string;
  title: string;
  description: string;
  enabled: boolean;
  lockedByPlatform: boolean;
}

export interface DashboardWidgetCompanySettingsResponse {
  message: string;
  settings: DashboardWidgetCompanySetting[];
}
