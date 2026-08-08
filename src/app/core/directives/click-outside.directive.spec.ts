import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClickOutsideDirective } from './click-outside.directive';

@Component({
  standalone: true,
  imports: [ClickOutsideDirective],
  template: `
    <div id="host" appClickOutside (appClickOutside)="onOutside()">
      <button id="inside-button" type="button">Dentro</button>
    </div>
    <div id="outside">Afuera</div>
  `,
})
class HostTestComponent {
  outsideCount = 0;

  onOutside(): void {
    this.outsideCount++;
  }
}

describe('ClickOutsideDirective', () => {
  let fixture: ComponentFixture<HostTestComponent>;
  let component: HostTestComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostTestComponent] });
    fixture = TestBed.createComponent(HostTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  it('emite el evento al hacer click fuera del elemento host', () => {
    const outside = fixture.nativeElement.querySelector('#outside') as HTMLElement;

    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(component.outsideCount).toBe(1);
  });

  it('NO emite el evento al hacer click dentro del elemento host', () => {
    const insideButton = fixture.nativeElement.querySelector('#inside-button') as HTMLElement;

    insideButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(component.outsideCount).toBe(0);
  });
});
