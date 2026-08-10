# Componentes compartidos

Esta carpeta contiene componentes reutilizables que se utilizan en múltiples partes de la aplicación.

## DataTableComponent

Componente de tabla completo y reutilizable que maneja automáticamente:

- Vista desktop (tabla HTML)
- Vista mobile (cards)
- Paginación integrada
- Templates personalizados
- Estados de carga y vacío

### Uso básico

```typescript
import { DataTableComponent, TableColumn } from '../../core/components';

@Component({
  imports: [DataTableComponent],
  template: `
    <app-data-table [data]="clients()" [columns]="columns" [isLoading]="isLoading()" [total]="total()" [currentPage]="currentPage()" [pageSize]="pageSize" [totalPages]="totalPages()" itemLabel="clientes" emptyMessage="No se encontraron clientes" (nextPage)="nextPage()" (previousPage)="previousPage()">
      <!-- Template de acciones -->
      <ng-template #actions let-client>
        <button (click)="edit(client)">Editar</button>
        <button (click)="delete(client)">Eliminar</button>
      </ng-template>
    </app-data-table>
  `,
})
export class ClientsComponent {
  columns: TableColumn<Client>[] = [
    { key: 'fullName', header: 'Cliente' },
    { key: 'company', header: 'Empresa', hideOnMobile: true },
    { key: 'email', header: 'Contacto' },
    {
      key: 'status',
      header: 'Estado',
      value: (client) => (client.isActive ? 'Activo' : 'Inactivo'),
    },
  ];
}
```

### Templates personalizados para celdas

Puedes personalizar cómo se renderiza cada celda usando `ng-template`:

```typescript
<app-data-table [data]="clients()" [columns]="columns">
  <!-- Template personalizado para la columna 'status' -->
  <ng-template #cellStatus let-client>
    <span [class]="client.isActive ? 'badge-success' : 'badge-inactive'">
      {{ client.isActive ? 'Activo' : 'Inactivo' }}
    </span>
  </ng-template>

  <!-- Acciones en desktop -->
  <ng-template #actions let-client>
    <button (click)="edit(client)">Editar</button>
  </ng-template>

  <!-- Card personalizado completo para mobile -->
  <ng-template #mobileCard let-client>
    <div class="custom-card">
      <h3>{{ client.fullName }}</h3>
      <p>{{ client.email }}</p>
    </div>
  </ng-template>
</app-data-table>
```

### Inputs

| Propiedad          | Tipo               | Required | Default                          | Descripción                 |
| ------------------ | ------------------ | -------- | -------------------------------- | --------------------------- |
| `data`             | `T[]`              | ✅       | -                                | Array de datos a mostrar    |
| `columns`          | `TableColumn<T>[]` | ✅       | -                                | Configuración de columnas   |
| `isLoading`        | `boolean`          | ❌       | `false`                          | Estado de carga             |
| `emptyMessage`     | `string`           | ❌       | `'No se encontraron resultados'` | Mensaje cuando no hay datos |
| `trackBy`          | `(item: T) => any` | ❌       | `(item) => item.id`              | Función de tracking         |
| `enablePagination` | `boolean`          | ❌       | `true`                           | Habilitar paginación        |
| `total`            | `number`           | ❌       | `0`                              | Total de items              |
| `currentPage`      | `number`           | ❌       | `1`                              | Página actual               |
| `pageSize`         | `number`           | ❌       | `10`                             | Items por página            |
| `totalPages`       | `number`           | ❌       | `1`                              | Total de páginas            |
| `itemLabel`        | `string`           | ❌       | `'items'`                        | Label para paginación       |

### TableColumn Interface

```typescript
interface TableColumn<T> {
  key: string; // Identificador único
  header: string; // Título en el header
  hideOnMobile?: boolean; // Ocultar en mobile
  align?: 'left' | 'center' | 'right'; // Alineación
  value?: (item: T) => string | number; // Función custom
  width?: string; // Ancho CSS
}
```

### Outputs

- `nextPage`: Emitido al navegar a la siguiente página
- `previousPage`: Emitido al navegar a la página anterior

### Templates disponibles

| Template         | Contexto                                | Descripción                  |
| ---------------- | --------------------------------------- | ---------------------------- |
| `#actions`       | `{ $implicit: T }`                      | Acciones en desktop          |
| `#mobileActions` | `{ $implicit: T }`                      | Acciones en mobile           |
| `#mobileCard`    | `{ $implicit: T }`                      | Card completo mobile         |
| `#cell{Key}`     | `{ $implicit: T, column: TableColumn }` | Template de celda específica |

---

## PaginationComponent

Componente de paginación reutilizable que muestra controles de navegación entre páginas con información resumida.

### Uso

```typescript
import { PaginationComponent } from '../../core/components/pagination.component';

@Component({
  // ...
  imports: [PaginationComponent],
  template: `
    <app-pagination
      [total]="total()"
      [currentPage]="currentPage()"
      [pageSize]="pageSize"
      [currentItems]="filteredItems().length"
      [totalPages]="totalPages()"
      itemLabel="clientes"
      (nextPage)="nextPage()"
      (previousPage)="previousPage()"
    />
  `
})
```

### Inputs

- **total** (required): Número total de items en la base de datos
- **currentPage** (required): Página actual (1-based)
- **pageSize** (required): Cantidad de items por página
- **currentItems** (required): Número de items actualmente mostrados en la página
- **totalPages** (required): Total de páginas calculado
- **itemLabel** (optional): Label descriptivo para los items (ej: 'usuarios', 'clientes'). Default: 'items'

### Outputs

- **nextPage**: Se emite cuando el usuario hace clic en "Siguiente"
- **previousPage**: Se emite cuando el usuario hace clic en "Anterior"

### Ejemplo completo

```typescript
export class ClientsComponent {
  readonly currentPage = signal(1);
  readonly pageSize = 10;
  readonly total = signal(0);
  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));
  readonly clients = signal<Client[]>([]);

  loadData(): void {
    this.service.getData(this.currentPage(), this.pageSize).subscribe({
      next: (response) => {
        this.clients.set(response.data);
        this.total.set(response.total);
      },
    });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadData();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadData();
    }
  }
}
```
