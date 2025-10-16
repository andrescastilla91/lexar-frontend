import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { MockDataService } from '../../core/services/mock-data.service';
import { Client } from '../../core/models/client.model';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  template: `
    <div class="space-y-8">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-slate-800">Clientes corporativos</h2>
          <p class="text-sm text-slate-500">Control completo de portafolio, riesgos y responsables asignados.</p>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 rounded-2xl bg-[#192033] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#111728]"
          (click)="togglePanel()"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo cliente
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
          <div class="grid gap-4 md:grid-cols-3">
            <label class="flex flex-col gap-2 text-sm text-slate-600 md:col-span-2">
              Búsqueda
              <input
                formControlName="search"
                type="search"
                placeholder="Nombre, empresa o correo"
                class="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-slate-600">
              Riesgo
              <select
                formControlName="risk"
                class="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              >
                <option value="todos">Todos</option>
                <option value="Alto">Alto</option>
                <option value="Medio">Medio</option>
                <option value="Bajo">Bajo</option>
              </select>
            </label>
          </div>
          <div class="grid gap-4 md:grid-cols-3">
            <label class="flex flex-col gap-2 text-sm text-slate-600">
              Asesor líder
              <select
                formControlName="advisorId"
                class="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              >
                <option value="todos">Todos</option>
                @for (advisor of advisors(); track advisor.id) {
                  <option [value]="advisor.id">{{ advisor.name }}</option>
                }
              </select>
            </label>
            <div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <p class="text-slate-500">Total clientes</p>
              <p class="text-2xl font-semibold text-slate-800">{{ clients().length }}</p>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <p class="text-slate-500">Riesgo alto</p>
              <p class="text-2xl font-semibold text-rose-600">{{ highRiskCount() }}</p>
            </div>
          </div>
        </form>

        @if (panelOpen()) {
          <div class="w-full lg:absolute lg:top-0 lg:right-0 lg:w-96 xl:w-[28rem] lg:z-20">
            <form
              class="grid gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg lg:shadow-2xl"
              [formGroup]="newClientForm"
              (ngSubmit)="submitClient()"
            >
              <h3 class="text-lg font-semibold text-slate-800">Registrar nuevo cliente</h3>
              <div class="grid gap-3">
                <label class="text-sm text-slate-600">
                  Razón social / Cliente
                  <input
                    formControlName="company"
                    type="text"
                    placeholder="Nombre de la organización"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Persona de contacto
                  <input
                    formControlName="name"
                    type="text"
                    placeholder="Contacto principal"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Correo
                  <input
                    formControlName="email"
                    type="email"
                    placeholder="contacto@empresa.com"
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
                <div class="grid gap-4 md:grid-cols-2">
                  <label class="text-sm text-slate-600">
                    Asesor asignado
                    <select
                      formControlName="assignedAdvisorId"
                      class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                    >
                      @for (advisor of advisors(); track advisor.id) {
                        <option [value]="advisor.id">{{ advisor.name }}</option>
                      }
                    </select>
                  </label>
                  <label class="text-sm text-slate-600">
                    Nivel de riesgo
                    <select
                      formControlName="riskLevel"
                      class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                    >
                      <option value="Bajo">Bajo</option>
                      <option value="Medio">Medio</option>
                      <option value="Alto">Alto</option>
                    </select>
                  </label>
                </div>
                <label class="text-sm text-slate-600">
                  Fecha de vinculación
                  <input
                    formControlName="createdAt"
                    type="date"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  />
                </label>
              </div>
              @if (formError()) {
                <p class="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{{ formError() }}</p>
              }
              <button type="submit" class="mt-2 rounded-2xl bg-[#192033] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#111728]">
                Guardar cliente
              </button>
            </form>
          </div>
        }
      </section>

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (client of filteredClients(); track client.id) {
          <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wide text-slate-400">Cliente</p>
                <h3 class="text-lg font-semibold text-slate-800">{{ client.company }}</h3>
                <p class="text-sm text-slate-500">{{ client.name }}</p>
              </div>
              <span class="rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="riskClasses(client.riskLevel)">
                Riesgo {{ client.riskLevel }}
              </span>
            </div>
            <dl class="mt-4 space-y-3 text-sm text-slate-600">
              <div class="flex items-center gap-2">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0v4.125c0 .621.504 1.125 1.125 1.125h1.125M7.5 12 5.25 9.75M7.5 12l-2.25 2.25" />
                </svg>
                <span>{{ client.email }}</span>
              </div>
              <div class="flex items-center gap-2">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.43-.108-.88.055-1.14.417l-.97 1.293c-.282.376-.769.542-1.21.401a12.035 12.035 0 0 1-7.144-7.143c-.141-.442.025-.93.401-1.211l1.293-.97a1.125 1.125 0 0 0 .417-1.139L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
                <span>{{ client.phone }}</span>
              </div>
              <div class="flex items-center gap-2">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5" />
                </svg>
                <span>Vinculado el {{ client.createdAt | date: 'dd/MM/yyyy' }}</span>
              </div>
            </dl>
            <div class="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <span>Asesor líder</span>
              <span class="font-semibold text-slate-700">{{ advisorName(client.assignedAdvisorId) }}</span>
            </div>
          </article>
        }
      </section>
    </div>
  `,
})
export class ClientsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dataService = inject(MockDataService);

  readonly advisors = this.dataService.advisors;
  readonly clients = this.dataService.clients;

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    risk: ['todos'],
    advisorId: ['todos'],
  });

  readonly newClientForm = this.fb.nonNullable.group({
    company: ['', [Validators.required]],
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    assignedAdvisorId: [this.advisors()[0]?.id ?? '', Validators.required],
    riskLevel: ['Medio', Validators.required],
    createdAt: [new Date().toISOString().slice(0, 10), Validators.required],
  });

  private readonly filterValue = toSignal(
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.getRawValue())),
    { initialValue: this.filterForm.getRawValue() }
  );

  readonly filteredClients = computed(() => {
    const filter = this.filterValue() ?? { search: '', risk: 'todos', advisorId: 'todos' };
    const term = (filter.search ?? '').toLowerCase();
    const risk = filter.risk ?? 'todos';
    const advisorId = filter.advisorId ?? 'todos';

    return this.clients().filter((client) => {
      const matchesTerm = [client.company, client.name, client.email].some((value) =>
        value.toLowerCase().includes(term)
      );
      const matchesRisk = risk === 'todos' || client.riskLevel === risk;
      const matchesAdvisor = advisorId === 'todos' || client.assignedAdvisorId === advisorId;
      return matchesTerm && matchesRisk && matchesAdvisor;
    });
  });

  readonly highRiskCount = computed(() => this.clients().filter((client) => client.riskLevel === 'Alto').length);

  readonly panelOpen = signal(false);
  readonly formError = signal<string | null>(null);

  togglePanel(): void {
    this.panelOpen.update((value) => !value);
  }

  submitClient(): void {
    if (this.newClientForm.invalid) {
      this.newClientForm.markAllAsTouched();
      this.formError.set('Completa los campos obligatorios.');
      return;
    }

    this.formError.set(null);
    const value = this.newClientForm.getRawValue() as Omit<Client, 'id'>;
    this.dataService.addClient(value);
    this.newClientForm.reset({
      company: '',
      name: '',
      email: '',
      phone: '',
      assignedAdvisorId: this.advisors()[0]?.id ?? '',
      riskLevel: 'Medio',
      createdAt: new Date().toISOString().slice(0, 10),
    });
    this.panelOpen.set(false);
  }

  advisorName(advisorId: string): string {
    return this.dataService.findAdvisorById(advisorId)?.name ?? 'No asignado';
  }

  riskClasses(risk: Client['riskLevel']): string {
    switch (risk) {
      case 'Alto':
        return 'bg-rose-100 text-rose-700';
      case 'Medio':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-emerald-100 text-emerald-700';
    }
  }
}
