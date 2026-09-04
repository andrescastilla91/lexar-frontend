import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, PRIMARY_OUTLET, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { environment } from '../../../environments/environment';

/**
 * F29(b) — ajuste 2026-09-03: el nombre de marca ("LexAr") podría cambiar, y
 * antes vivía repetido como texto literal en ~30 `title` de `app.routes.ts`
 * ("Tablero · LexAr", "Empresas · Panel LexAr"...). Un rename hubiera
 * significado tocar cada ruta. Ahora el nombre vive en un solo lugar
 * (`environment.brandName`, horneado en build por el Dockerfile igual que
 * `apiUrl`/`sentryDsn` — ver `Dockerfile` y `environments/environment.ts`) y
 * la concatenación "Sección · Sufijo" ocurre acá, en una sola función. Cada
 * ruta solo declara su nombre de sección corto (`title: 'Tablero'`) y,
 * cuando no es el actor "app" por defecto, un `data: { titleSuffix }`.
 *
 * `titleSuffix` no hace falta declararlo en cada ruta hija: esta estrategia
 * recorre la cadena de rutas activas de raíz a hoja (como hace
 * `DefaultTitleStrategy` con `title`) y usa el `titleSuffix` más profundo
 * que encuentre — declararlo una vez en la ruta padre (`admin`, `portal`)
 * alcanza para todos sus hijos.
 */
export type TitleSuffixMode = 'app' | 'portal' | 'admin' | 'literal';

@Injectable({ providedIn: 'root' })
export class LexArTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly brand = environment.brandName;

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    // Igual que DefaultTitleStrategy: si la ruta activa no resuelve ningún
    // título (ni el propio ni el de un ancestro), no se toca document.title
    // — el criterio de aceptación de F29 "una ruta sin título no rompe la
    // app" depende exactamente de este comportamiento.
    if (title !== undefined) {
      this.title.setTitle(title);
    }
  }

  override buildTitle(snapshot: RouterStateSnapshot): string | undefined {
    let route: ActivatedRouteSnapshot | undefined = snapshot.root;
    let section: string | undefined;
    let suffixMode: TitleSuffixMode = 'app';

    while (route !== undefined) {
      section = this.getResolvedTitleForRoute(route) ?? section;
      const dataSuffix = route.data['titleSuffix'] as TitleSuffixMode | undefined;
      if (dataSuffix) {
        suffixMode = dataSuffix;
      }
      route = route.children.find((child) => child.outlet === PRIMARY_OUTLET);
    }

    if (section === undefined) {
      return undefined;
    }

    // 'literal': el propio `title` de la ruta ya es la cadena completa a
    // mostrar (p. ej. login, que usa el claim de marca "LexAr — Gestión
    // legal" en vez del patrón "Sección · Sufijo").
    if (suffixMode === 'literal') {
      return section;
    }

    return `${section} · ${this.suffixLabel(suffixMode)}`;
  }

  private suffixLabel(mode: Exclude<TitleSuffixMode, 'literal'>): string {
    switch (mode) {
      case 'portal':
        return `Portal ${this.brand}`;
      case 'admin':
        return `Panel ${this.brand}`;
      case 'app':
      default:
        return this.brand;
    }
  }
}
