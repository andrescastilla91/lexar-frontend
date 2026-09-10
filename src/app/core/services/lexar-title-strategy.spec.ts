import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Routes, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { LexArTitleStrategy } from './lexar-title-strategy';

/**
 * F29(b) — fix 2026-09-03: la primera versión de este spec armaba
 * `ActivatedRouteSnapshot`/`RouterStateSnapshot` a mano, con un `title`
 * puesto directamente como propiedad plana. Eso rompía en todos los casos
 * (`buildTitle` devolvía `undefined` siempre) porque `TitleStrategy` (la
 * clase base de Angular, heredada sin overridear) no lee `snapshot.title`
 * — lee `snapshot.data[RouteTitleKey]`, un `Symbol` **privado** que Angular
 * setea internamente al resolver la ruta (`ActivatedRouteSnapshot.title` es
 * un getter que hace exactamente esa misma lectura). No hay forma de
 * reconstruir ese símbolo desde fuera del paquete, así que un snapshot
 * fabricado a mano nunca puede simular un título resuelto de verdad.
 *
 * La única forma correcta de probar `buildTitle`/`updateTitle` es con
 * snapshots reales, producidos por una navegación real —
 * `RouterTestingHarness`, igual que hace `app.routes.spec.ts`. Ese archivo
 * ya cubre el modo `'app'` (suffix por defecto) y `'portal'` (heredado de
 * un padre); este cubre lo que falta: `'admin'` y `'literal'`, y que
 * `updateTitle` no llama a `Title.setTitle` cuando no hay título resuelto.
 */
describe('LexArTitleStrategy (mecanismo real vía RouterTestingHarness)', () => {
  @Component({ selector: 'app-test-leaf', template: '' })
  class TestLeafComponent {}

  @Component({ selector: 'app-test-no-title', template: '' })
  class TestNoTitleComponent {}

  const testRoutes: Routes = [
    {
      path: 'admin-test',
      component: TestLeafComponent,
      title: 'Empresas',
      data: { titleSuffix: 'admin' },
    },
    {
      path: 'login-test',
      component: TestLeafComponent,
      title: `${environment.brandName} — Gestión legal`,
      data: { titleSuffix: 'literal' },
    },
    { path: 'sin-titulo-test', component: TestNoTitleComponent },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(testRoutes), { provide: TitleStrategy, useClass: LexArTitleStrategy }],
    });
  });

  it('modo "admin": concatena "Sección · Panel <marca>"', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin-test');

    expect(TestBed.inject(Title).getTitle()).toBe(`Empresas · Panel ${environment.brandName}`);
  });

  it('modo "literal": usa el `title` de la ruta tal cual, sin concatenar nada (caso login)', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login-test');

    expect(TestBed.inject(Title).getTitle()).toBe(`${environment.brandName} — Gestión legal`);
  });

  it('updateTitle no llama a Title.setTitle si la ruta activa no resuelve ningún título', async () => {
    const setTitleSpy = jest.spyOn(TestBed.inject(Title), 'setTitle');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/sin-titulo-test');

    expect(setTitleSpy).not.toHaveBeenCalled();
  });
});
