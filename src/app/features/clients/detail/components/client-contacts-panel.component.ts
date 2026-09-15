import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientsService } from '../../../../core/services/clients.service';
import { ClientContactResponse } from '../../../../core/models/client-backend.model';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * F33 §2: pestaña Contactos de la ficha del cliente. CRUD completo contra
 * `client-contacts` (1-a-muchos, reemplaza el email/teléfono único del
 * modelo anterior). Reutiliza `clients.view`/`clients.edit` — F33 no creó
 * permisos nuevos para este sub-recurso.
 */
@Component({
  selector: 'app-client-contacts-panel',
  standalone: true,
  imports: [ReactiveFormsModule, HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface shadow-card">
      <div class="flex items-center justify-between border-b border-default p-4">
        <h3 class="text-sm font-semibold text-text">Contactos ({{ contacts().length }})</h3>
        <button
          *hasPermission="'clients.edit'"
          type="button"
          (click)="openCreateForm()"
          class="rounded-md bg-navy-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-950"
        >
          + Agregar contacto
        </button>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else if (contacts().length === 0) {
        <p class="p-6 text-sm text-subtle">Este cliente no tiene contactos registrados.</p>
      } @else {
        <ul class="divide-y divide-default">
          @for (contact of contacts(); track contact.id) {
            <li class="flex items-start justify-between gap-4 p-4">
              <div>
                <p class="font-medium text-text">
                  {{ contact.name }}
                  @if (contact.isPrimary) {
                    <span class="ml-2 rounded-full bg-primary-tint px-2 py-0.5 text-xs font-semibold text-info">Principal</span>
                  }
                </p>
                <p class="text-xs text-subtle">{{ contact.role || 'Sin rol' }}</p>
                <p class="mt-1 text-xs text-muted">
                  {{ contact.email || 'Sin email' }} · {{ contact.phone || contact.mobile || 'Sin teléfono' }}
                </p>
              </div>
              <div class="flex shrink-0 gap-2">
                <button
                  *hasPermission="'clients.edit'"
                  type="button"
                  (click)="openEditForm(contact)"
                  class="rounded-lg p-2 text-subtle hover:bg-surface-muted hover:text-text"
                  title="Editar"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                  </svg>
                </button>
                <button
                  *hasPermission="'clients.edit'"
                  type="button"
                  (click)="remove(contact)"
                  class="rounded-lg p-2 text-danger hover:bg-danger-tint"
                  title="Eliminar"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </li>
          }
        </ul>
      }
    </div>

    @if (isFormOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div class="w-full max-w-md rounded-lg border border-default bg-surface p-6 shadow-2xl">
          <h3 class="mb-4 text-lg font-semibold text-text">
            {{ editingContactId() ? 'Editar contacto' : 'Nuevo contacto' }}
          </h3>
          <form [formGroup]="form" (ngSubmit)="save()" class="space-y-4">
            <label class="block text-sm text-muted">
              Nombre *
              <input
                formControlName="name"
                type="text"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <label class="block text-sm text-muted">
              Rol / cargo
              <input
                formControlName="role"
                type="text"
                placeholder="Ej: Representante legal"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="text-sm text-muted">
                Email
                <input
                  formControlName="email"
                  type="email"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
              <label class="text-sm text-muted">
                Teléfono
                <input
                  formControlName="phone"
                  type="text"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
            </div>
            <label class="block text-sm text-muted">
              Celular
              <input
                formControlName="mobile"
                type="text"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <label class="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" formControlName="isPrimary" />
              Marcar como contacto principal
            </label>

            @if (errorMessage()) {
              <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
                {{ errorMessage() }}
              </div>
            }

            <div class="flex gap-3">
              <button
                type="button"
                (click)="closeForm()"
                class="flex-1 rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="flex-1 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
                [disabled]="isSaving() || form.invalid"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class ClientContactsPanelComponent implements OnInit {
  clientId = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly clientsService = inject(ClientsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  readonly contacts = signal<ClientContactResponse[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isFormOpen = signal(false);
  readonly editingContactId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    role: [''],
    email: ['', [Validators.email]],
    phone: [''],
    mobile: [''],
    isPrimary: [false],
  });

  ngOnInit(): void {
    this.loadContacts();
  }

  private loadContacts(): void {
    this.isLoading.set(true);
    this.clientsService.getContacts(this.clientId()).subscribe({
      next: (contacts) => {
        this.contacts.set(contacts);
        this.isLoading.set(false);
      },
      error: () => {
        this.contacts.set([]);
        this.isLoading.set(false);
      },
    });
  }

  openCreateForm(): void {
    this.editingContactId.set(null);
    this.errorMessage.set(null);
    this.form.reset({ name: '', role: '', email: '', phone: '', mobile: '', isPrimary: false });
    this.isFormOpen.set(true);
  }

  openEditForm(contact: ClientContactResponse): void {
    this.editingContactId.set(contact.id);
    this.errorMessage.set(null);
    this.form.reset({
      name: contact.name,
      role: contact.role || '',
      email: contact.email || '',
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      isPrimary: contact.isPrimary,
    });
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  save(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();
    const editingId = this.editingContactId();

    const request$ = editingId
      ? this.clientsService.updateContact(editingId, {
          name: value.name,
          role: value.role || undefined,
          email: value.email || undefined,
          phone: value.phone || undefined,
          mobile: value.mobile || undefined,
          isPrimary: value.isPrimary,
        })
      : this.clientsService.createContact({
          clientId: this.clientId(),
          name: value.name,
          role: value.role || undefined,
          email: value.email || undefined,
          phone: value.phone || undefined,
          mobile: value.mobile || undefined,
          isPrimary: value.isPrimary,
        });

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isFormOpen.set(false);
        this.toast.success(editingId ? 'Contacto actualizado exitosamente' : 'Contacto creado exitosamente');
        this.loadContacts();
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Error al guardar contacto');
        this.isSaving.set(false);
      },
    });
  }

  async remove(contact: ClientContactResponse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar contacto',
      message: `¿Eliminar a "${contact.name}" de los contactos de este cliente?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.clientsService.removeContact(contact.id).subscribe({
      next: () => {
        this.toast.success('Contacto eliminado exitosamente');
        this.loadContacts();
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al eliminar contacto');
      },
    });
  }
}
