import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminPermission, AdminPermissionGroup } from '../../../core/models/admin.model';

interface PermissionGroupView {
  code: string;
  label: string;
  description: string | null;
  permissions: AdminPermission[];
}

// Búsqueda insensible a tildes (mismo mecanismo que CatalogAssignModalComponent):
// construido con códigos ASCII para evitar bytes Unicode literales ambiguos en
// el código fuente.
const DIACRITIC_RANGE_START = 0x0300;
const DIACRITIC_RANGE_END = 0x036f;
const COMBINING_DIACRITICS_RANGE = new RegExp(
  '[' + String.fromCharCode(DIACRITIC_RANGE_START) + '-' + String.fromCharCode(DIACRITIC_RANGE_END) + ']',
  'g',
);

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS_RANGE, '')
    .toLowerCase()
    .trim();
}

@Component({
  selector: 'app-admin-permissions',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-2xl font-semibold text-text">Permisos</h1>
        <p class="mt-1 text-sm text-subtle">
          Controla, a nivel de toda la plataforma, el nombre, descripción y grupo con el que cada permiso aparece en "Gestionar permisos" de los tenants. El code técnico nunca se muestra allí.
        </p>
      </div>

      @if (!isLoading()) {
        <div class="flex flex-wrap items-center gap-3">
          <input
            type="search"
            [ngModel]="searchTerm"
            (ngModelChange)="onSearchTermChange($event)"
            placeholder="Buscar por nombre, descripción o grupo..."
            class="w-full max-w-sm rounded-md border border-default px-3 py-1.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
          />
          <button
            type="button"
            class="text-xs font-medium text-muted underline-offset-2 hover:underline"
            (click)="expandAll()"
          >
            Expandir todos
          </button>
          <button
            type="button"
            class="text-xs font-medium text-muted underline-offset-2 hover:underline"
            (click)="collapseAll()"
          >
            Colapsar todos
          </button>
          <span class="text-xs text-subtle">{{ visibleGroups().length }} de {{ groupedPermissions().length }} grupos</span>
        </div>
      }

      @if (isLoading()) {
        <div class="flex items-center justify-center py-8">
          <div class="h-6 w-6 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else {
        <div class="space-y-3">
          @for (group of visibleGroups(); track group.code) {
            <section class="rounded-lg border border-default bg-surface shadow-card">
              <div class="border-b border-default px-6 py-4">
                @if (editingGroup() === group.code) {
                  <div class="flex flex-col gap-2">
                    <input
                      type="text"
                      [(ngModel)]="draftGroupLabel"
                      maxlength="150"
                      class="block w-full max-w-sm rounded-md border border-default px-3 py-1.5 text-sm font-semibold text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    />
                    <textarea
                      [(ngModel)]="draftGroupDescription"
                      rows="2"
                      maxlength="2000"
                      placeholder="Descripción del grupo (opcional)"
                      class="block w-full max-w-lg rounded-md border border-default px-3 py-1.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    ></textarea>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        class="rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-950 disabled:opacity-60"
                        [disabled]="isSavingGroup()"
                        (click)="saveGroup(group)"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        class="rounded-md border border-default px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-muted"
                        [disabled]="isSavingGroup()"
                        (click)="cancelEditGroup()"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                } @else {
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <button
                      type="button"
                      class="flex min-w-0 flex-1 items-start gap-2 text-left"
                      (click)="toggleGroup(group.code)"
                    >
                      <span class="mt-1 text-subtle transition-transform" [class.rotate-90]="isExpanded(group.code)">›</span>
                      <span class="min-w-0">
                        <span class="flex items-center gap-2">
                          <h2 class="text-base font-semibold text-text">{{ group.label }}</h2>
                          <span class="text-xs text-subtle">({{ group.permissions.length }})</span>
                        </span>
                        @if (group.description) {
                          <p class="mt-1 text-sm text-subtle">{{ group.description }}</p>
                        }
                      </span>
                    </button>
                    <button
                      type="button"
                      class="shrink-0 text-xs font-medium text-muted underline-offset-2 hover:underline"
                      (click)="startEditGroup(group)"
                    >
                      Renombrar grupo
                    </button>
                  </div>
                }
              </div>

              @if (isExpanded(group.code)) {
                <div class="divide-y divide-default">
                  @for (permission of group.permissions; track permission.code) {
                    <div class="flex flex-col gap-2 px-6 py-3">
                      @if (editingPermission() === permission.code) {
                        <div class="flex flex-col gap-2">
                          <label class="text-xs font-medium text-subtle" [attr.for]="'label-' + permission.code">Nombre</label>
                          <input
                            [id]="'label-' + permission.code"
                            type="text"
                            [(ngModel)]="draftPermissionLabel"
                            maxlength="150"
                            class="block w-full max-w-sm rounded-md border border-default px-3 py-1.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                          />
                          <label class="text-xs font-medium text-subtle" [attr.for]="'desc-' + permission.code">Descripción</label>
                          <textarea
                            [id]="'desc-' + permission.code"
                            [(ngModel)]="draftPermissionDescription"
                            rows="2"
                            maxlength="2000"
                            class="block w-full max-w-lg rounded-md border border-default px-3 py-1.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                          ></textarea>
                          <div class="flex gap-2">
                            <button
                              type="button"
                              class="rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-950 disabled:opacity-60"
                              [disabled]="isSavingPermission()"
                              (click)="savePermission(permission)"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              class="rounded-md border border-default px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-muted"
                              [disabled]="isSavingPermission()"
                              (click)="cancelEditPermission()"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      } @else {
                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <p class="text-sm font-medium text-text">{{ permission.label }}</p>
                            <button
                              type="button"
                              class="text-xs font-medium text-muted underline-offset-2 hover:underline"
                              (click)="startEditPermission(permission)"
                            >
                              Editar
                            </button>
                          </div>
                          <p class="mt-0.5 text-xs text-subtle">{{ permission.description }}</p>
                          <p class="mt-0.5 font-mono text-[11px] text-subtle/70">{{ permission.code }}</p>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </section>
          }
          @if (visibleGroups().length === 0) {
            <p class="py-8 text-center text-sm text-subtle">Ningún permiso coincide con "{{ searchTerm }}".</p>
          }
        </div>
      }
    </div>
  `,
})
export class AdminPermissionsComponent implements OnInit {
  private readonly platformAdminService = inject(PlatformAdminService);
  private readonly toast = inject(ToastService);

  readonly permissions = signal<AdminPermission[]>([]);
  readonly groups = signal<AdminPermissionGroup[]>([]);
  readonly isLoading = signal(false);

  readonly editingPermission = signal<string | null>(null);
  readonly isSavingPermission = signal(false);
  draftPermissionLabel = '';
  draftPermissionDescription = '';

  readonly editingGroup = signal<string | null>(null);
  readonly isSavingGroup = signal(false);
  draftGroupLabel = '';
  draftGroupDescription = '';

  // UI-F31 (2026-09-02): antes se listaban todos los grupos siempre
  // expandidos — con ~15 grupos y ~60 permisos ya era un scroll largo, y
  // el catálogo solo va a crecer. Ahora arrancan colapsados y el usuario
  // decide qué abrir; el buscador expande automáticamente los grupos que
  // coinciden para no obligar a abrir uno por uno.
  readonly expandedGroupCodes = signal<Set<string>>(new Set());
  searchTerm = '';
  private readonly searchTermSignal = signal('');

  readonly groupedPermissions = computed<PermissionGroupView[]>(() => {
    const groupsByCode = new Map(this.groups().map((g) => [g.code, g]));
    const byGroup = new Map<string, AdminPermission[]>();
    for (const permission of this.permissions()) {
      const list = byGroup.get(permission.groupCode) ?? [];
      list.push(permission);
      byGroup.set(permission.groupCode, list);
    }
    return Array.from(byGroup.entries())
      .map(([code, permissions]) => {
        const group = groupsByCode.get(code);
        return {
          code,
          label: group?.label ?? permissions[0]?.groupLabel ?? code,
          description: group?.description ?? null,
          permissions: [...permissions].sort((a, b) => a.label.localeCompare(b.label)),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  readonly visibleGroups = computed<PermissionGroupView[]>(() => {
    const term = normalizeSearchText(this.searchTermSignal());
    if (!term) {
      return this.groupedPermissions();
    }
    return this.groupedPermissions()
      .map((group) => {
        const groupMatches =
          normalizeSearchText(group.label).includes(term) ||
          normalizeSearchText(group.description ?? '').includes(term);
        const matchingPermissions = group.permissions.filter(
          (p) =>
            normalizeSearchText(p.label).includes(term) ||
            normalizeSearchText(p.description).includes(term) ||
            normalizeSearchText(p.code).includes(term),
        );
        return {
          ...group,
          permissions: groupMatches ? group.permissions : matchingPermissions,
        };
      })
      .filter((group) => group.permissions.length > 0);
  });

  ngOnInit(): void {
    this.loadAll();
  }

  onSearchTermChange(value: string): void {
    this.searchTerm = value;
    this.searchTermSignal.set(value);
    // Si hay texto de búsqueda, expandir automáticamente los grupos que
    // quedaron visibles para que el usuario no tenga que abrir cada uno.
    if (this.searchTermSignal().trim()) {
      this.expandedGroupCodes.set(new Set(this.visibleGroups().map((g) => g.code)));
    }
  }

  isExpanded(groupCode: string): boolean {
    return this.expandedGroupCodes().has(groupCode);
  }

  toggleGroup(groupCode: string): void {
    this.expandedGroupCodes.update((current) => {
      const next = new Set(current);
      if (next.has(groupCode)) {
        next.delete(groupCode);
      } else {
        next.add(groupCode);
      }
      return next;
    });
  }

  expandAll(): void {
    this.expandedGroupCodes.set(new Set(this.groupedPermissions().map((g) => g.code)));
  }

  collapseAll(): void {
    this.expandedGroupCodes.set(new Set());
  }

  private loadAll(): void {
    this.isLoading.set(true);
    this.platformAdminService.listPermissionGroups().subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.platformAdminService.listPermissions().subscribe({
          next: (permissions) => {
            this.permissions.set(permissions);
            this.isLoading.set(false);
          },
          error: (error) => {
            this.toast.error(error.message || 'No se pudieron cargar los permisos.');
            this.isLoading.set(false);
          },
        });
      },
      error: (error) => {
        this.toast.error(error.message || 'No se pudieron cargar los grupos de permisos.');
        this.isLoading.set(false);
      },
    });
  }

  startEditPermission(permission: AdminPermission): void {
    this.editingPermission.set(permission.code);
    this.draftPermissionLabel = permission.label;
    this.draftPermissionDescription = permission.description;
  }

  cancelEditPermission(): void {
    this.editingPermission.set(null);
    this.draftPermissionLabel = '';
    this.draftPermissionDescription = '';
  }

  savePermission(permission: AdminPermission): void {
    if (this.isSavingPermission()) {
      return;
    }
    const trimmedLabel = this.draftPermissionLabel.trim();
    if (!trimmedLabel) {
      this.toast.error('El nombre no puede quedar vacío.');
      return;
    }
    const trimmedDescription = this.draftPermissionDescription.trim();
    if (!trimmedDescription) {
      this.toast.error('La descripción no puede quedar vacía.');
      return;
    }

    this.isSavingPermission.set(true);
    this.platformAdminService
      .updatePermission(permission.code, { label: trimmedLabel, description: trimmedDescription })
      .subscribe({
        next: (updated) => {
          this.permissions.update((items) =>
            items.map((p) => (p.code === permission.code ? updated : p)),
          );
          this.isSavingPermission.set(false);
          this.editingPermission.set(null);
          this.toast.success('Permiso actualizado.');
        },
        error: (error) => {
          this.toast.error(error.message || 'No se pudo actualizar el permiso.');
          this.isSavingPermission.set(false);
        },
      });
  }

  startEditGroup(group: PermissionGroupView): void {
    this.editingGroup.set(group.code);
    this.draftGroupLabel = group.label;
    this.draftGroupDescription = group.description ?? '';
  }

  cancelEditGroup(): void {
    this.editingGroup.set(null);
    this.draftGroupLabel = '';
    this.draftGroupDescription = '';
  }

  saveGroup(group: PermissionGroupView): void {
    if (this.isSavingGroup()) {
      return;
    }
    const trimmedLabel = this.draftGroupLabel.trim();
    if (!trimmedLabel) {
      this.toast.error('El nombre del grupo no puede quedar vacío.');
      return;
    }

    this.isSavingGroup.set(true);
    this.platformAdminService
      .updatePermissionGroup(group.code, {
        label: trimmedLabel,
        description: this.draftGroupDescription.trim() || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.groups.update((items) =>
            items.map((g) => (g.code === group.code ? updated : g)),
          );
          this.isSavingGroup.set(false);
          this.editingGroup.set(null);
          this.toast.success('Grupo actualizado.');
        },
        error: (error) => {
          this.toast.error(error.message || 'No se pudo actualizar el grupo.');
          this.isSavingGroup.set(false);
        },
      });
  }
}
