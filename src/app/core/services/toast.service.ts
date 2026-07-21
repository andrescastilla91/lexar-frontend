import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const AUTO_DISMISS_MS = 4000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly state = signal<ToastItem[]>([]);
  readonly toasts = this.state.asReadonly();
  private nextId = 1;

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  dismiss(id: number): void {
    this.state.update((items) => items.filter((item) => item.id !== id));
  }

  private push(type: ToastType, message: string): void {
    const id = this.nextId++;
    this.state.update((items) => [...items, { id, type, message }]);
    setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
  }
}
