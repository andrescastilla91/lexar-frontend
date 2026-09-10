import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TaskResponse } from '../../../core/models/task.model';
import {
  getTaskPriorityClasses,
  getTaskPriorityLabel,
  getTaskStatusClasses,
  getTaskStatusLabel,
} from '../../../core/utils/task-format.util';

/**
 * F32 PR1 — extraído de dashboard.component.ts sin cambiar comportamiento.
 * Widget "today-tasks" del catálogo (ver docs/05-features/F32): "Tareas de
 * hoy", trabajo pendiente con vencimiento el día de hoy.
 */
@Component({
  selector: 'app-dashboard-today-tasks-widget',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <header class="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-text">Tareas de hoy</h3>
          <p class="text-sm text-subtle">Trabajo pendiente con vencimiento el día de hoy.</p>
        </div>
        <div class="flex flex-shrink-0 items-center gap-3">
          @if (!isLoading()) {
            <span class="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted tabular-data">
              {{ tasks().length }} {{ tasks().length === 1 ? 'tarea' : 'tareas' }}
            </span>
          }
          <a routerLink="/tareas" class="text-xs font-semibold text-primary underline"> Ver tareas </a>
        </div>
      </header>

      @if (isLoading()) {
        <div class="space-y-3">
          @for (i of [1, 2]; track i) {
            <div class="h-14 animate-pulse rounded-lg bg-surface-sunken"></div>
          }
        </div>
      } @else if (tasks().length === 0) {
        <p class="rounded-lg border border-default bg-surface-muted px-4 py-6 text-center text-sm text-subtle">
          No tienes tareas pendientes con vencimiento hoy.
        </p>
      } @else {
        <div class="space-y-3">
          @for (task of tasks(); track task.id) {
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-default bg-surface-muted px-4 py-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="truncate text-sm font-semibold text-text">{{ task.title }}</p>
                  <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="getTaskPriorityClasses(task.priority)">
                    {{ getTaskPriorityLabel(task.priority) }}
                  </span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="getTaskStatusClasses(task.status)">
                    {{ getTaskStatusLabel(task.status) }}
                  </span>
                </div>
                <p class="truncate text-xs text-subtle">{{ task.process?.title ?? 'Tarea general' }}</p>
              </div>
              @if (task.dueAt) {
                <span class="flex-shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted tabular-data">
                  {{ task.dueAt | date: 'HH:mm' }}
                </span>
              }
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class DashboardTodayTasksWidgetComponent {
  tasks = input<TaskResponse[]>([]);
  isLoading = input(false);

  protected readonly getTaskPriorityClasses = getTaskPriorityClasses;
  protected readonly getTaskPriorityLabel = getTaskPriorityLabel;
  protected readonly getTaskStatusClasses = getTaskStatusClasses;
  protected readonly getTaskStatusLabel = getTaskStatusLabel;
}
