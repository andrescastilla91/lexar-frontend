import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuditTabsComponent } from './audit-tabs.component';

describe('AuditTabsComponent', () => {
  function create() {
    TestBed.configureTestingModule({
      imports: [AuditTabsComponent],
      providers: [provideRouter([{ path: '**', children: [] }])],
    });
    const fixture = TestBed.createComponent(AuditTabsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra las tres secciones de auditoría con su ruta', () => {
    const fixture = create();

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    );
    expect(links.map((l) => l.textContent?.trim())).toEqual([
      'Actividad',
      'Aceptaciones de términos',
      'Autorizaciones de clientes',
    ]);
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/auditoria',
      '/auditoria/aceptaciones',
      '/auditoria/autorizaciones',
    ]);
  });

  it('marca como activa solo la pestaña de la ruta actual', async () => {
    const fixture = create();
    await TestBed.inject(Router).navigateByUrl('/auditoria/aceptaciones');
    await fixture.whenStable();
    fixture.detectChanges();

    const current = (fixture.nativeElement as HTMLElement).querySelectorAll('a[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0].textContent?.trim()).toBe('Aceptaciones de términos');
  });
});
