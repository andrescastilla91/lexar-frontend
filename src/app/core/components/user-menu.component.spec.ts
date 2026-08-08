import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserMenuComponent } from './user-menu.component';

describe('UserMenuComponent', () => {
  let fixture: ComponentFixture<UserMenuComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UserMenuComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(UserMenuComponent);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  function openMenu(): void {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  }

  it('abre el menú al hacer click en el botón', () => {
    openMenu();

    expect(fixture.componentInstance.open()).toBe(true);
  });

  // Bug corregido 2026-08-08: el menú solo se cerraba al hacer click en una
  // opción — un click fuera (en cualquier parte de la página, no solo en el
  // header) debe cerrarlo también. Ver ClickOutsideDirective.
  it('cierra el menú al hacer click fuera, en cualquier parte del documento', () => {
    openMenu();

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
    outside.remove();
  });

  it('NO cierra el menú al hacer click dentro del panel desplegable', () => {
    openMenu();

    const panel = fixture.nativeElement.querySelector('.absolute') as HTMLElement;
    panel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(true);
  });
});
