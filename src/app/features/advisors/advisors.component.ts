import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { MockDataService } from '../../core/services/mock-data.service';
import { Advisor } from '../../core/models/advisor.model';

type AdvisorStatus = Advisor['status'];
type FilterStatus = AdvisorStatus | 'todos';

@Component({
  selector: 'app-advisors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-8">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-slate-800">Asesores legales</h2>
          <p class="text-sm text-slate-500">Gestiona perfiles, disponibilidad y métricas de desempeño.</p>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 rounded-2xl bg-[#192033] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#111728]"
          (click)="togglePanel()"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo perfil
        </button>
      </header>

      <section
        class="relative grid gap-6 transition-all lg:min-h-[22rem]"
        [ngClass]="panelOpen() ? 'lg:pr-[26rem] lg:pb-6 lg:min-h-[36rem]' : ''"
      >
        <form
          class="w-full max-w-4xl lg:min-w-[48rem] grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          [formGroup]="filterForm"
        >
          <div class="grid gap-4 md:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm text-slate-600">
              Búsqueda rápida
              <input
                type="search"
                formControlName="search"
                placeholder="Nombre, especialidad o correo"
                class="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-slate-600">
              Estado
              <select
                formControlName="status"
                class="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              >
                <option value="todos">Todos</option>
                <option value="Disponible">Disponible</option>
                <option value="En audiencia">En audiencia</option>
                <option value="En reunión">En reunión</option>
              </select>
            </label>
          </div>
          <div class="grid gap-4 md:grid-cols-3">
            <div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <p class="text-slate-500">Talento total</p>
              <p class="text-2xl font-semibold text-slate-800">{{ advisors().length }}</p>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <p class="text-slate-500">Disponibles</p>
              <p class="text-2xl font-semibold text-emerald-600">{{ availableAdvisors() }}</p>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <p class="text-slate-500">Audiencias hoy</p>
              <p class="text-2xl font-semibold text-amber-500">{{ inHearingToday() }}</p>
            </div>
          </div>
        </form>

        @if (panelOpen()) {
          <div class="w-full lg:absolute lg:top-0 lg:right-0 lg:w-96 xl:w-[28rem] lg:z-20">
            <form
              class="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg lg:shadow-2xl"
              [formGroup]="newAdvisorForm"
              (ngSubmit)="submitAdvisor()"
            >
              <h3 class="text-lg font-semibold text-slate-800">Registrar nuevo asesor</h3>
              <div class="grid gap-4">
                <label class="text-sm text-slate-600">
                  Nombre completo
                  <input
                    formControlName="name"
                    type="text"
                    placeholder="Introduce nombre y apellidos"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Correo profesional
                  <input
                    formControlName="email"
                    type="email"
                    placeholder="asesor@lexar.com"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Teléfono
                  <input
                    formControlName="phone"
                    type="text"
                    placeholder="+57 300 000 0000"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Especialidad
                  <input
                    formControlName="specialty"
                    type="text"
                    placeholder="Derecho administrativo, penal, etc."
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  />
                </label>
                <div class="grid gap-4 md:grid-cols-2">
                  <label class="text-sm text-slate-600">
                    Estado
                    <select
                      formControlName="status"
                      class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                    >
                      <option value="Disponible">Disponible</option>
                      <option value="En audiencia">En audiencia</option>
                      <option value="En reunión">En reunión</option>
                    </select>
                  </label>
                  <label class="text-sm text-slate-600">
                    Años de experiencia
                    <input
                      formControlName="experienceYears"
                      type="number"
                      min="0"
                      class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                    />
                  </label>
                </div>
                <label class="text-sm text-slate-600">
                  Calificación promedio
                  <input
                    formControlName="rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  />
                </label>
              </div>
              @if (formError()) {
                <p class="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{{ formError() }}</p>
              }
              <button
                type="submit"
                class="mt-2 rounded-2xl bg-[#192033] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#111728]"
              >
                Guardar perfil
              </button>
            </form>
          </div>
        }
      </section>

      <section class="grid gap-4">
        @for (advisor of filteredAdvisors(); track advisor.id) {
          <article class="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
            <div class="flex flex-1 flex-col gap-2">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-[#192033]/10 text-[#192033] text-sm font-semibold">
                  {{ initials(advisor.name) }}
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-slate-800">{{ advisor.name }}</h3>
                  <p class="text-sm text-slate-500">{{ advisor.email }} • {{ advisor.phone }}</p>
                </div>
              </div>
              <p class="text-sm text-slate-600">Especialidad: <span class="font-semibold text-slate-800">{{ advisor.specialty }}</span></p>
            </div>
            <div class="flex flex-col items-start gap-3 text-sm text-slate-600 md:flex-row md:items-center">
              <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium"
                [ngClass]="statusClasses(advisor.status)">
                <span class="h-2.5 w-2.5 rounded-full" [ngClass]="dotClasses(advisor.status)"></span>
                {{ advisor.status }}
              </span>
              <span class="flex items-center gap-2">
                <svg class="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="m10 15.27 5.18 3.05-1.64-5.81L18 8.97l-6-.21L10 3l-2 5.76-6 .21 4.46 3.54L6.82 18z" />
                </svg>
                {{ advisor.rating }}
              </span>
              <span>{{ advisor.experienceYears }} años exp.</span>
            </div>
          </article>
        }
      </section>
    </div>
  `,
})
export class AdvisorsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dataService = inject(MockDataService);

  readonly advisors = this.dataService.advisors;

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['todos' as FilterStatus],
  });

  readonly newAdvisorForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    specialty: ['', [Validators.required]],
    status: ['Disponible' as AdvisorStatus, Validators.required],
    experienceYears: [5, [Validators.required, Validators.min(0)]],
    rating: [4.5, [Validators.required, Validators.min(0), Validators.max(5)]],
  });

  private readonly filterValue = toSignal(
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.getRawValue())),
    { initialValue: this.filterForm.getRawValue() }
  );

  readonly filteredAdvisors = computed(() => {
    const filter = this.filterValue() ?? { search: '', status: 'todos' as FilterStatus };
    const search = filter.search ?? '';
    const status = filter.status ?? ('todos' as FilterStatus);
    const term = (search ?? '').toLowerCase();
    return this.advisors()
      .filter((advisor) => {
        const matchesTerm = [advisor.name, advisor.email, advisor.specialty]
          .some((value) => value.toLowerCase().includes(term));
        const matchesStatus = status === 'todos' || advisor.status === status;
        return matchesTerm && matchesStatus;
      })
      .sort((a, b) => b.rating - a.rating);
  });

  readonly availableAdvisors = computed(() =>
    this.advisors().filter((advisor) => advisor.status === 'Disponible').length
  );

  readonly inHearingToday = computed(() =>
    this.advisors().filter((advisor) => advisor.status === 'En audiencia').length
  );

  readonly panelOpen = signal(false);
  readonly formError = signal<string | null>(null);

  togglePanel(): void {
    this.panelOpen.update((value) => !value);
  }

  submitAdvisor(): void {
    if (this.newAdvisorForm.invalid) {
      this.newAdvisorForm.markAllAsTouched();
      this.formError.set('Por favor completa los campos obligatorios.');
      return;
    }

    this.formError.set(null);
    const advisor = this.newAdvisorForm.getRawValue() as Omit<Advisor, 'id'>;
    this.dataService.addAdvisor(advisor);
    this.newAdvisorForm.reset({
      name: '',
      email: '',
      phone: '',
      specialty: '',
      status: 'Disponible',
      experienceYears: 5,
      rating: 4.5,
    });
    this.panelOpen.set(false);
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  statusClasses(status: AdvisorStatus): string {
    switch (status) {
      case 'Disponible':
        return 'bg-emerald-100 text-emerald-700';
      case 'En audiencia':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  dotClasses(status: AdvisorStatus): string {
    switch (status) {
      case 'Disponible':
        return 'bg-emerald-500';
      case 'En audiencia':
        return 'bg-amber-500';
      default:
        return 'bg-slate-400';
    }
  }
}
