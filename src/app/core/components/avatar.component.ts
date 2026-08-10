import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (url()) {
      <img
        [src]="url()"
        [alt]="label()"
        class="rounded-full object-cover"
        [style.width.px]="size()"
        [style.height.px]="size()"
      />
    } @else {
      <div
        class="flex items-center justify-center rounded-full font-semibold"
        [class]="toneClass()"
        [style.width.px]="size()"
        [style.height.px]="size()"
        [style.font-size.px]="fontSize()"
      >
        {{ initials() }}
      </div>
    }
  `,
})
export class AvatarComponent {
  url = input<string | null>(null);
  initials = input('');
  label = input('Avatar');
  size = input(40);
  tone = input<'navy' | 'white'>('navy');

  readonly toneClass = computed(() =>
    this.tone() === 'white' ? 'bg-white/10 text-white' : 'bg-navy-900 text-white',
  );

  readonly fontSize = computed(() => Math.max(10, Math.round(this.size() * 0.4)));
}
