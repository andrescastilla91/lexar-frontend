import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ToastComponent } from './toast.component';
import { ToastService } from '../services/toast.service';

describe('ToastComponent', () => {
  let toastService: ToastService;

  function createComponent() {
    TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [provideRouter([])],
    });
    toastService = TestBed.inject(ToastService);
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza el mensaje de cada toast activo', () => {
    const fixture = createComponent();
    toastService.success('Guardado correctamente');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Guardado correctamente');
  });

  it('el botón cerrar descarta el toast', () => {
    const fixture = createComponent();
    toastService.success('Guardado correctamente');
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector('button[aria-label="Cerrar"]') as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();

    expect(toastService.toasts()).toEqual([]);
  });

  it('sin acción, no renderiza ningún enlace', () => {
    const fixture = createComponent();
    toastService.error('Algo falló');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });

  it('con acción, renderiza el enlace con su label y lo descarta al hacer clic', () => {
    const fixture = createComponent();
    toastService.error('Llegaste al límite de tu plan', {
      label: 'Ver planes',
      routerLink: ['/configuracion'],
      queryParams: { tab: 'plan' },
    });
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Ver planes');

    link.click();
    fixture.detectChanges();

    expect(toastService.toasts()).toEqual([]);
  });
});
