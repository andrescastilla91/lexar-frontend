# Guía de migración a DataTableComponent

Este documento explica cómo migrar componentes existentes que usan tablas tradicionales al nuevo `DataTableComponent` reutilizable.

## Beneficios de la migración

✅ **Reducción de código**: ~70% menos código en el template
✅ **Consistencia**: Diseño uniforme en toda la aplicación
✅ **Mantenibilidad**: Cambios centralizados afectan todas las tablas
✅ **Responsive**: Mobile-first automático
✅ **Performance**: Optimizado con trackBy y signals

## Antes vs Después

### ANTES: Código tradicional (~200 líneas)

```typescript
@Component({
  template: `
    <!-- Vista Desktop -->
    <div class="hidden md:block">
      <table class="w-full">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Empresa</th>
            <th>Contacto</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (client of clients(); track client.id) {
            <tr>
              <td>
                <div>
                  <p>{{ client.fullName }}</p>
                  <p class="text-sm">{{ client.identificationNumber }}</p>
                </div>
              </td>
              <td>{{ client.companyName || 'N/A' }}</td>
              <td>
                <p>{{ client.email }}</p>
                <p>{{ client.phone || 'N/A' }}</p>
              </td>
              <td>
                <span [class]="client.isActive ? 'active' : 'inactive'">
                  {{ client.isActive ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <button (click)="edit(client)">Editar</button>
                <button (click)="delete(client)">Eliminar</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Vista Mobile -->
    <div class="md:hidden">
      @for (client of clients(); track client.id) {
        <div class="card">
          <div><strong>Cliente:</strong> {{ client.fullName }}</div>
          <div><strong>Empresa:</strong> {{ client.companyName || 'N/A' }}</div>
          <div><strong>Contacto:</strong> {{ client.email }}</div>
          <div><strong>Estado:</strong> {{ client.isActive ? 'Activo' : 'Inactivo' }}</div>
          <div class="actions">
            <button (click)="edit(client)">Editar</button>
            <button (click)="delete(client)">Eliminar</button>
          </div>
        </div>
      }
    </div>

    <!-- Paginación -->
    <div class="pagination">
      <button (click)="previousPage()" [disabled]="currentPage === 1">Anterior</button>
      <span>{{ currentPage }} / {{ totalPages }}</span>
      <button (click)="nextPage()" [disabled]="currentPage >= totalPages">Siguiente</button>
    </div>
  `
})
```

### DESPUÉS: Con DataTableComponent (~60 líneas)

```typescript
@Component({
  imports: [DataTableComponent],
  template: `
    <app-data-table
      [data]="clients()"
      [columns]="columns"
      [isLoading]="isLoading()"
      [total]="total()"
      [currentPage]="currentPage()"
      [pageSize]="pageSize"
      [totalPages]="totalPages()"
      itemLabel="clientes"
      (nextPage)="nextPage()"
      (previousPage)="previousPage()"
    >
      <!-- Solo templates personalizados necesarios -->
      <ng-template #cellClient let-client>
        <div>
          <p>{{ client.fullName }}</p>
          <p class="text-sm">{{ client.identificationNumber }}</p>
        </div>
      </ng-template>

      <ng-template #cellStatus let-client>
        <span [class]="client.isActive ? 'active' : 'inactive'">
          {{ client.isActive ? 'Activo' : 'Inactivo' }}
        </span>
      </ng-template>

      <ng-template #actions let-client>
        <button (click)="edit(client)">Editar</button>
        <button (click)="delete(client)">Eliminar</button>
      </ng-template>
    </app-data-table>
  `
})
export class ClientsComponent {
  columns: TableColumn<Client>[] = [
    { key: 'client', header: 'Cliente' },
    { key: 'companyName', header: 'Empresa', value: (c) => c.companyName || 'N/A' },
    { key: 'email', header: 'Contacto' },
    { key: 'status', header: 'Estado', align: 'center' },
  ];
}
```

## Pasos de migración

### 1. Importar el componente

```typescript
import { DataTableComponent, TableColumn } from '../../core/components';

@Component({
  imports: [DataTableComponent],
  // ...
})
```

### 2. Definir las columnas

Crea un array de configuración de columnas:

```typescript
readonly columns: TableColumn<YourType>[] = [
  {
    key: 'name',              // Clave única
    header: 'Nombre',         // Título del header
    hideOnMobile: false,      // Opcional: ocultar en mobile
    align: 'left',            // Opcional: left, center, right
    width: '200px',           // Opcional: ancho fijo
    value: (item) => item.fullName  // Opcional: transformación
  },
  // ... más columnas
];
```

### 3. Reemplazar el template

Sustituye toda la sección de tabla + cards + paginación por:

```typescript
<app-data-table
  [data]="yourData()"
  [columns]="columns"
  [isLoading]="isLoading()"
  [total]="total()"
  [currentPage]="currentPage()"
  [pageSize]="pageSize"
  [totalPages]="totalPages()"
  itemLabel="items"
  (nextPage)="nextPage()"
  (previousPage)="previousPage()"
>
  <!-- Templates personalizados aquí -->
</app-data-table>
```

### 4. Agregar templates personalizados

Solo para celdas que necesiten formateo especial:

```typescript
<!-- El nombre debe ser #cell{Key} donde Key es la columna -->
<ng-template #cellStatus let-item>
  <span class="badge" [class.active]="item.isActive">
    {{ item.isActive ? 'Activo' : 'Inactivo' }}
  </span>
</ng-template>
```

### 5. Agregar acciones

```typescript
<ng-template #actions let-item>
  <button (click)="edit(item)">Editar</button>
  <button (click)="delete(item)">Eliminar</button>
</ng-template>

<!-- Opcional: acciones diferentes en mobile -->
<ng-template #mobileActions let-item>
  <button class="btn-mobile" (click)="edit(item)">Editar</button>
  <button class="btn-mobile" (click)="delete(item)">Eliminar</button>
</ng-template>
```

## Casos de uso comunes

### Columna con icono

```typescript
<ng-template #cellStatus let-user>
  <div class="flex items-center gap-2">
    <svg class="h-4 w-4" [class.text-green-500]="user.isActive">...</svg>
    <span>{{ user.isActive ? 'Activo' : 'Inactivo' }}</span>
  </div>
</ng-template>
```

### Columna con badge

```typescript
<ng-template #cellRisk let-client>
  <span
    class="badge"
    [class.badge-low]="client.riskLevel === 'LOW'"
    [class.badge-high]="client.riskLevel === 'HIGH'"
  >
    {{ client.riskLevel }}
  </span>
</ng-template>
```

### Columna con múltiples valores

```typescript
<ng-template #cellContact let-client>
  <div>
    <p class="font-medium">{{ client.email }}</p>
    <p class="text-sm text-gray-500">{{ client.phone || 'Sin teléfono' }}</p>
  </div>
</ng-template>
```

### Acciones con permisos

```typescript
<ng-template #actions let-user>
  <button
    *hasPermission="'users.edit'"
    (click)="edit(user)"
    class="btn-icon"
  >
    <svg>...</svg>
  </button>
  <button
    *hasPermission="'users.delete'"
    (click)="delete(user)"
    class="btn-icon-danger"
  >
    <svg>...</svg>
  </button>
</ng-template>
```

### Card mobile personalizado completo

Si necesitas cambiar completamente la estructura mobile:

```typescript
<ng-template #mobileCard let-client>
  <div class="custom-card">
    <div class="card-header">
      <h3>{{ client.fullName }}</h3>
      <span [class]="client.isActive ? 'active' : 'inactive'">
        {{ client.isActive ? 'Activo' : 'Inactivo' }}
      </span>
    </div>
    <div class="card-body">
      <p><strong>Email:</strong> {{ client.email }}</p>
      <p><strong>Teléfono:</strong> {{ client.phone || 'N/A' }}</p>
    </div>
    <div class="card-actions">
      <button (click)="edit(client)">Editar</button>
    </div>
  </div>
</ng-template>
```

## Checklist de migración

- [ ] Importar `DataTableComponent` y `TableColumn`
- [ ] Definir array `columns` con la configuración
- [ ] Reemplazar HTML de tabla desktop por `<app-data-table>`
- [ ] Eliminar código de cards mobile duplicado
- [ ] Eliminar código de paginación manual
- [ ] Crear templates `#cell{Key}` solo para celdas personalizadas
- [ ] Crear template `#actions` para las acciones
- [ ] Opcional: crear `#mobileActions` si son diferentes
- [ ] Opcional: crear `#mobileCard` si necesitas estructura custom
- [ ] Verificar que `trackBy` funcione correctamente
- [ ] Probar en desktop y mobile
- [ ] Eliminar código CSS que ya no se usa

## Problemas comunes

### ❌ Los templates no se aplican

**Problema:** El template personalizado no se renderiza.

**Solución:** Verifica que el nombre del template sea exactamente `#cell{Key}` donde `Key` coincide con `column.key`.

```typescript
// Configuración
{ key: 'status', header: 'Estado' }

// Template debe ser:
<ng-template #cellStatus let-item>...</ng-template>
```

### ❌ La columna muestra "N/A"

**Problema:** La columna muestra "N/A" aunque el valor existe.

**Solución:** Verifica que la clave coincida con la propiedad del objeto o usa la función `value`:

```typescript
// Opción 1: Clave directa
{ key: 'email', header: 'Email' }  // busca item.email

// Opción 2: Valor anidado (usa notación de punto)
{ key: 'user.profile.name', header: 'Nombre' }

// Opción 3: Función personalizada
{ 
  key: 'email', 
  header: 'Email',
  value: (item) => item.contactInfo?.email || 'Sin email'
}
```

### ❌ Las acciones no aparecen

**Problema:** Las acciones no se muestran en la tabla.

**Solución:** Asegúrate de que el template se llame exactamente `#actions`:

```typescript
<!-- ✅ Correcto -->
<ng-template #actions let-item>
  <button>Editar</button>
</ng-template>

<!-- ❌ Incorrecto -->
<ng-template #action let-item>
  <button>Editar</button>
</ng-template>
```

## Mejoras futuras

El `DataTableComponent` puede extenderse con:

- [ ] Ordenamiento por columna (sort)
- [ ] Selección múltiple (checkboxes)
- [ ] Expandir/colapsar filas
- [ ] Columnas dinámicas (mostrar/ocultar)
- [ ] Exportar a CSV/Excel
- [ ] Resize de columnas
- [ ] Sticky headers

Si necesitas alguna de estas funcionalidades, considera extender el componente base.
