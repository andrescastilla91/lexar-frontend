import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { ProcessEventsService } from '../../core/services/process-events.service';
import { AdvisorsService } from '../../core/services/advisors.service';
import { ClientsService } from '../../core/services/clients.service';
import { FilesService } from '../../core/services/files.service';
import { AdvisorResponse } from '../../core/models/advisor-backend.model';
import { ClientResponse } from '../../core/models/client-backend.model';
import { PaginationComponent } from '../../core/components/pagination.component';
import { forkJoin, of, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { 
  LegalProcessResponse, 
  ProcessStatus, 
  ProcessStage, 
  RiskLevel,
  CreateLegalProcessRequest,
  UpdateLegalProcessRequest,
  UpdateProcessStatusRequest
} from '../../core/models/legal-process.model';
import { ProcessEvent, ProcessEventType } from '../../core/models/process-event.model';

@Component({
  selector: 'app-processes',
  standalone: true,
  imports: [ReactiveFormsModule, PaginationComponent],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-text">Procesos judiciales y administrativos</h2>
          <p class="text-sm text-subtle">Monitorea etapas, responsables y niveles de riesgo procesal.</p>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
          (click)="togglePanel()"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo proceso
        </button>
      </header>

      <!-- Filters Panel -->
      <section class="relative grid gap-6">
        <form
          class="grid gap-4 rounded-lg border border-default bg-surface p-6 shadow-card"
          [formGroup]="filterForm"
          (ngSubmit)="applyFilters()"
        >
          <div class="grid gap-4 md:grid-cols-4">
            <label class="flex flex-col gap-2 text-sm text-muted md:col-span-2">
              Búsqueda
              <input
                formControlName="search"
                type="search"
                placeholder="Título, número de caso, descripción"
                class="rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-muted">
              Estado
              <select
                formControlName="status"
                class="rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option [value]="null">Todos</option>
                <option [value]="ProcessStatus.DRAFT">Borrador</option>
                <option [value]="ProcessStatus.ACTIVE">Activo</option>
                <option [value]="ProcessStatus.UNDER_REVIEW">En Revisión</option>
                <option [value]="ProcessStatus.SUSPENDED">Suspendido</option>
                <option [value]="ProcessStatus.COMPLETED">Completado</option>
                <option [value]="ProcessStatus.CANCELLED">Cancelado</option>
                <option [value]="ProcessStatus.ARCHIVED">Archivado</option>
              </select>
            </label>
            <label class="flex flex-col gap-2 text-sm text-muted">
              Cliente
              <select
                formControlName="clientId"
                class="rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option [value]="null">Todos</option>
                @for (client of clients(); track client.id) {
                  <option [value]="client.id">{{ client.fullName }}</option>
                }
              </select>
            </label>
          </div>
          <div class="flex gap-2">
            <button
              type="submit"
              class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950"
            >
              Aplicar filtros
            </button>
            <button
              type="button"
              (click)="resetFilters()"
              class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <!-- Create/Edit Form Modal -->
      @if (panelOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" (click)="closePanel($event)">
          <form 
            class="w-full max-w-xl md:max-w-2xl grid gap-4 rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl max-h-[90vh] overflow-y-auto" 
            [formGroup]="processForm" 
            (ngSubmit)="submitProcess()"
            (click)="$event.stopPropagation()"
          >
            <h3 class="text-lg font-semibold text-text">
              {{ editingProcess() ? 'Editar proceso' : 'Registrar nuevo proceso' }}
            </h3>
            @if (processStatusMessage()) {
              <div class="rounded-md border border-warning bg-warning-tint px-4 py-3">
                <div class="flex items-start gap-2">
                  <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p class="text-sm text-warning">{{ processStatusMessage() }}</p>
                </div>
              </div>
            }
            <div class="grid gap-4">
              <label class="text-sm text-muted">
                Título del proceso *
                <input
                  formControlName="title"
                  type="text"
                  placeholder="Nombre referencial del proceso"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </label>
              <label class="text-sm text-muted">
                Descripción
                <textarea
                  formControlName="description"
                  placeholder="Detalles del proceso"
                  rows="3"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                ></textarea>
              </label>
              <div class="grid gap-4 md:grid-cols-2">
                <label class="text-sm text-muted">
                  Cliente *
                  <select
                    formControlName="clientId"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  >
                    <option value="">Seleccionar cliente</option>
                    @for (client of clients(); track client.id) {
                      <option [value]="client.id">{{ client.fullName }}</option>
                    }
                  </select>
                </label>
                <div class="text-sm text-muted">
                  <label class="mb-2 block">Asesores responsables</label>
                  <div class="mt-2 max-h-40 overflow-y-auto rounded-md border border-default bg-surface-muted p-3 shadow-card">
                    @if (advisors().length === 0) {
                      <p class="text-center text-xs text-subtle">No hay asesores disponibles</p>
                    } @else {
                      <div class="space-y-2">
                        @for (advisor of advisors(); track advisor.id) {
                          <label class="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-surface">
                            <input
                              type="checkbox"
                              [checked]="isAdvisorSelected(advisor.id)"
                              (change)="toggleAdvisor(advisor.id)"
                              class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-2 focus:ring-navy-900/30"
                            />
                            <div class="flex-1">
                              <p class="text-xs font-medium text-text">
                                {{ advisor.user?.firstName }} {{ advisor.user?.lastName }}
                              </p>
                              <p class="text-xs text-subtle">{{ advisor.specialty }}</p>
                            </div>
                          </label>
                        }
                      </div>
                    }
                  </div>
                  <p class="mt-1 text-xs text-subtle">Selecciona uno o más asesores para el proceso</p>
                </div>
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                <label class="text-sm text-muted">
                  Etapa
                  <select
                    formControlName="stage"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  >
                    <option [value]="ProcessStage.INVESTIGATION">Investigación</option>
                    <option [value]="ProcessStage.HEARING">Audiencia</option>
                    <option [value]="ProcessStage.NOTIFICATION">Notificación</option>
                    <option [value]="ProcessStage.EXECUTION">Ejecución</option>
                  </select>
                </label>
                <label class="text-sm text-muted">
                  Nivel de Riesgo
                  <select
                    formControlName="riskLevel"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  >
                    <option [value]="RiskLevel.LOW">Bajo</option>
                    <option [value]="RiskLevel.MEDIUM">Medio</option>
                    <option [value]="RiskLevel.HIGH">Alto</option>
                  </select>
                </label>
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                <label class="text-sm text-muted">
                  Corte / Jurisdicción
                  <input
                    formControlName="court"
                    type="text"
                    placeholder="Entidad o despacho"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  />
                </label>
                <div class="text-sm text-muted">
                  <label class="block">Número de Caso</label>
                  <div class="mt-2 flex gap-2">
                    <input
                      formControlName="caseNumber"
                      type="text"
                      placeholder="Radicado o número de expediente"
                      class="flex-1 rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    />
                    <button
                      type="button"
                      (click)="generateCaseNumber()"
                      class="rounded-md bg-surface-muted px-4 py-2.5 text-sm font-semibold text-text transition hover:bg-surface-sunken"
                      title="Generar número automático"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </button>
                  </div>
                  <p class="mt-1 text-xs text-subtle">Puedes generar un número automático o ingresarlo manualmente</p>
                </div>
              </div>
              <div class="grid gap-4 md:grid-cols-3">
                <label class="text-sm text-muted">
                  Fecha de Inicio
                  <input
                    formControlName="startDate"
                    type="date"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  />
                </label>
                <label class="text-sm text-muted">
                  Próxima Audiencia
                  <input
                    formControlName="nextHearingDate"
                    type="date"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  />
                </label>
                <label class="text-sm text-muted">
                  Fecha de Fin
                  <input
                    formControlName="endDate"
                    type="date"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  />
                </label>
              </div>
            </div>
            @if (formError()) {
              <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ formError() }}</p>
            }
            <div class="flex gap-2">
              <button 
                type="submit" 
                class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:opacity-50 disabled:cursor-not-allowed"
                [disabled]="isLoading() || !canEditProcess()"
              >
                {{ editingProcess() ? 'Actualizar' : 'Guardar' }} proceso
              </button>
              <button 
                type="button" 
                (click)="togglePanel()"
                class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Status Update Modal (HU-14) -->
      @if (statusModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" (click)="closeStatusModal($event)">
          <form 
            class="w-full max-w-md grid gap-4 rounded-lg border border-default bg-surface p-6 shadow-2xl" 
            [formGroup]="statusForm" 
            (ngSubmit)="updateStatus()"
            (click)="$event.stopPropagation()"
          >
            <h3 class="text-lg font-semibold text-text">Cambiar estado del proceso</h3>
            <div class="grid gap-4">
              <label class="text-sm text-muted">
                Nuevo Estado *
                <select
                  formControlName="status"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                >
                  @for (status of validNextStatuses(); track status) {
                    <option [value]="status">{{ getStatusLabel(status) }}</option>
                  }
                </select>
                @if (validNextStatuses().length === 0) {
                  <p class="mt-1 text-xs text-subtle">No hay transiciones de estado disponibles desde el estado actual.</p>
                } @else {
                  <p class="mt-1 text-xs text-subtle">Estados disponibles según el flujo de trabajo</p>
                }
              </label>
              <label class="text-sm text-muted">
                Notas
                <textarea
                  formControlName="notes"
                  placeholder="Razón del cambio de estado (opcional)"
                  rows="3"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                ></textarea>
              </label>
            </div>
            @if (formError()) {
              <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ formError() }}</p>
            }
            <div class="flex gap-2">
              <button 
                type="submit" 
                class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950"
                [disabled]="isLoading()"
              >
                Actualizar estado
              </button>
              <button 
                type="button" 
                (click)="closeStatusModal()"
                class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      }

      <!-- HU-17: History Modal -->
      @if (historyModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" (click)="closeHistoryModal($event)">
          <div 
            class="w-full max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col rounded-lg border border-default bg-surface shadow-2xl overflow-hidden max-h-[85vh]" 
            (click)="$event.stopPropagation()"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-default p-6">
              <div>
                <h3 class="text-lg font-semibold text-text">Historial del proceso</h3>
                <p class="text-sm text-subtle">{{ editingProcess()?.title }}</p>
              </div>
              <button
                type="button"
                (click)="closeHistoryModal()"
                class="rounded-md p-2 text-subtle hover:bg-surface-muted hover:text-muted"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Timeline Content -->
            <div class="flex-1 overflow-y-auto p-6">
              @if (isLoadingHistory()) {
                <div class="flex items-center justify-center py-12">
                  <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
                </div>
              } @else if (processHistory().length === 0) {
                <div class="py-12 text-center">
                  <p class="text-sm text-subtle">No hay eventos registrados para este proceso</p>
                </div>
              } @else {
                <div class="space-y-4">
                  @for (event of processHistory(); track event.id) {
                    <div class="flex gap-4">
                      <!-- Timeline line -->
                      <div class="flex flex-col items-center">
                        <div class="flex h-8 w-8 items-center justify-center rounded-full {{ getEventColor(event.type) }}">
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path [attr.d]="getEventIcon(event.type)" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>
                        </div>
                        @if (!$last) {
                          <div class="h-full w-0.5 bg-default"></div>
                        }
                      </div>

                      <!-- Event content -->
                      <div class="flex-1 pb-8">
                        <div class="flex items-start justify-between">
                          <div class="flex-1">
                            <div class="flex items-center gap-2">
                              <span class="text-xs font-semibold text-muted {{ getEventColor(event.type) }} px-2 py-0.5 rounded-full">
                                {{ getEventLabel(event.type) }}
                              </span>
                              <span class="text-xs text-subtle">{{ formatDate(event.createdAt) }}</span>
                            </div>
                            <p class="mt-1 text-sm text-text">{{ event.description }}</p>
                            
                            <!-- Archivos adjuntos -->
                            @if (event.attachments && event.attachments.length > 0) {
                              <div class="mt-3">
                                <p class="text-xs font-medium text-muted mb-2">Archivos adjuntos:</p>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  @for (attachment of event.attachments; track attachment.url) {
                                    <div class="flex items-center justify-between rounded-lg border border-default bg-surface-muted p-2 hover:bg-surface-muted transition">
                                      <div class="flex items-center gap-2 flex-1 min-w-0">
                                        <svg class="h-4 w-4 flex-shrink-0 text-subtle" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                        </svg>
                                        <div class="flex-1 min-w-0">
                                          <p class="text-xs font-medium text-text truncate">{{ attachment.filename }}</p>
                                          <p class="text-xs text-subtle">{{ formatBytes(attachment.size) }}</p>
                                        </div>
                                      </div>
                                      <div class="flex gap-1 flex-shrink-0">
                                        <button
                                          type="button"
                                          (click)="previewFileFromHistory(attachment.url, attachment.filename)"
                                          class="rounded-lg p-1.5 text-primary hover:bg-info-tint transition"
                                          title="Ver archivo"
                                        >
                                          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                          </svg>
                                        </button>
                                        <button
                                          type="button"
                                          (click)="downloadFile(attachment.url)"
                                          class="rounded-lg p-1.5 text-success hover:bg-success-tint transition"
                                          title="Descargar archivo"
                                        >
                                          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  }
                                </div>
                              </div>
                            }
                            
                            <div class="mt-1 flex items-center gap-2 text-xs text-subtle">
                              <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                              </svg>
                              <span>{{ event.user.firstName }} {{ event.user.lastName }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Footer -->
            <div class="border-t border-default p-4">
              <button
                type="button"
                (click)="closeHistoryModal()"
                class="w-full rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- File Preview Modal -->
      @if (previewingFile()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" (click)="closePreviewModal()">
          <div class="w-full max-w-5xl flex flex-col rounded-lg border border-default bg-surface shadow-2xl overflow-hidden max-h-[90vh]" (click)="$event.stopPropagation()">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-default p-4">
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-semibold text-text truncate">{{ previewingFile()?.filename }}</h3>
              </div>
              <button
                type="button"
                (click)="closePreviewModal()"
                class="rounded-md p-2 text-subtle hover:bg-surface-muted hover:text-muted"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-auto p-6 bg-surface-muted">
              @if (isImageContentType(previewingFile()!.contentType)) {
                <img [src]="previewUrl()!" [alt]="previewingFile()!.filename" class="mx-auto max-w-full rounded-md shadow-raised" />
              } @else if (isPdfContentType(previewingFile()!.contentType)) {
                <iframe [src]="previewUrl()!" class="h-[70vh] w-full rounded-md border border-default bg-surface"></iframe>
              } @else {
                <div class="flex flex-col items-center justify-center py-12">
                  <svg class="h-16 w-16 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <p class="mt-4 text-sm text-subtle">Vista previa no disponible para este tipo de archivo</p>
                  <button
                    type="button"
                    (click)="downloadFile(previewingFile()!.id)"
                    class="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                  >
                    Descargar archivo
                  </button>
                </div>
              }
            </div>

            <!-- Footer -->
            <div class="border-t border-default p-4 flex gap-2 justify-end">
              <button
                type="button"
                (click)="downloadFile(previewingFile()!.id)"
                class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Descargar
              </button>
              <button
                type="button"
                (click)="closePreviewModal()"
                class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted hover:bg-surface-muted"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- HU-16: Annotation Modal -->
      @if (annotationModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" (click)="closeAnnotationModal($event)">
          <form 
            class="w-full max-w-sm md:max-w-2xl lg:max-w-4xl grid gap-4 rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl max-h-[90vh] overflow-y-auto" 
            [formGroup]="annotationForm" 
            (ngSubmit)="submitAnnotation()"
            (click)="$event.stopPropagation()"
          >
            <h3 class="text-lg font-semibold text-text">Agregar anotación</h3>
            <strong>Proceso: </strong>
            <h4 class="text-lg text-subtle"> {{ editingProcess()?.title }}</h4>
            
            <div class="grid gap-4">
              <label class="text-sm text-muted">
                Descripción *
                <textarea
                  formControlName="description"
                  placeholder="Describe el evento, acción o nota importante..."
                  rows="4"
                  maxlength="2000"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                ></textarea>
                <p class="mt-1 text-xs text-subtle">
                  {{ annotationForm.get('description')?.value?.length || 0 }} / 2000 caracteres
                </p>
              </label>

              <!-- Cargar archivos opcionales -->
              <div class="border-t border-default pt-4">
                <label class="text-sm font-semibold text-text">
                  Archivos adjuntos (opcional)
                  <div class="mt-2 flex items-center gap-2">
                    <div class="flex-1 cursor-pointer">
                      <div class="flex items-center gap-3 rounded-md border-2 border-dashed {{ annotationFiles().length > 0 ? 'border-primary bg-primary-tint' : 'border-strong bg-surface-muted' }} px-4 py-3 transition hover:border-primary hover:bg-primary-tint">
                        <svg class="h-5 w-5 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                        </svg>
                        <div class="flex-1 min-w-0">
                          <input
                            type="file"
                            multiple
                            (change)="onAnnotationFilesSelected($event)"
                            class="hidden"
                            #annotationFileInput
                          />
                          <p class="text-sm font-medium text-text">
                            @if (annotationFiles().length > 0) {
                              {{ annotationFiles().length }} archivo(s) seleccionado(s)
                            } @else {
                              Seleccionar archivos
                            }
                          </p>
                          <p class="text-xs text-subtle">Click para adjuntar archivos a esta anotación</p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      (click)="annotationFileInput.click()"
                      class="rounded-md border border-default px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-muted"
                    >
                      Adjuntar
                    </button>
                  </div>
                </label>

                <!-- Lista de archivos seleccionados -->
                @if (annotationFiles().length > 0) {
                  <div class="mt-3 space-y-2">
                    @for (file of annotationFiles(); track $index) {
                      <div class="flex items-center justify-between rounded-lg border border-default bg-surface px-3 py-2">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                          <svg class="h-4 w-4 text-subtle flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          <span class="text-sm text-text truncate">{{ file.name }}</span>
                          <span class="text-xs text-subtle">{{ formatBytes(file.size) }}</span>
                        </div>
                        <button
                          type="button"
                          (click)="removeAnnotationFile($index)"
                          class="rounded p-1 text-subtle hover:bg-danger-tint hover:text-danger"
                        >
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            @if (formError()) {
              <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ formError() }}</p>
            }

            <div class="flex gap-2">
              <button 
                type="submit" 
                class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950"
                [disabled]="isLoading() || annotationForm.invalid"
              >
                Guardar anotación
              </button>
              <button 
                type="button" 
                (click)="closeAnnotationModal()"
                class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Data Table -->
      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else if (processes().length === 0) {
        <div class="rounded-lg border border-default bg-surface p-12 text-center">
          <p class="text-subtle">No hay procesos registrados</p>
        </div>
      } @else {
        <!-- Vista de Lista (Cards) -->
        <div class="space-y-4">
          @for (process of processes(); track process.id) {
            <div class="rounded-lg border border-default bg-surface p-6 shadow-card hover:shadow-card transition-shadow">
              <div class="space-y-4">
                <!-- Header: Título y Botones de Acción -->
                <div class="flex items-start justify-between gap-4">
                  <!-- Título y Número de Caso -->
                  <div class="flex-1 min-w-0">
                    <h3 class="text-lg font-semibold text-text">{{ process.title }}</h3>
                    <p class="mt-1 font-mono text-sm text-subtle">
                      {{ process.caseNumber || 'Sin número de caso asignado' }}
                    </p>
                  </div>

                  <!-- Botones de Acción (solo iconos) -->
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="editProcess(process)"
                      class="rounded-lg p-2 text-subtle transition hover:bg-surface-muted hover:text-text"
                      title="Editar proceso"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 3.487 3.65 3.65a1 1 0 0 1 0 1.415L8.96 20.104a1 1 0 0 1-.708.292H4.5a.75.75 0 0 1-.75-.75v-3.752a1 1 0 0 1 .293-.707L15.447 3.487a1 1 0 0 1 1.415 0Z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      (click)="openStatusModal(process)"
                      class="rounded-lg p-2 text-primary transition hover:bg-primary-tint"
                      title="Cambiar estado"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      (click)="openHistoryModal(process)"
                      class="rounded-lg p-2 text-accent transition hover:bg-accent-tint"
                      title="Ver historial"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </button>

                    @if (process.status === ProcessStatus.ACTIVE) {
                      <button
                        type="button"
                        (click)="openAnnotationModal(process)"
                        class="rounded-lg p-2 text-success transition hover:bg-success-tint"
                        title="Agregar anotación"
                      >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </button>
                    }

                    <button
                      type="button"
                      (click)="deleteProcess(process)"
                      class="rounded-lg p-2 text-danger transition hover:bg-danger-tint"
                      title="Eliminar proceso"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Grid de Información -->
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <!-- Cliente -->
                  <div>
                    <p class="text-xs font-medium text-subtle uppercase tracking-wide">Cliente</p>
                    <p class="mt-1 text-sm font-medium text-text">{{ process.client.fullName || 'Sin cliente' }}</p>
                  </div>

                  <!-- Estado -->
                  <div>
                    <p class="text-xs font-medium text-subtle uppercase tracking-wide">Estado</p>
                    <span class="mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                      [class]="getStatusClasses(process.status)">
                      <span class="h-2 w-2 rounded-full" [class]="getStatusDot(process.status)"></span>
                      {{ getStatusLabel(process.status) }}
                    </span>
                  </div>

                  <!-- Etapa -->
                  <div>
                    <p class="text-xs font-medium text-subtle uppercase tracking-wide">Etapa</p>
                    <p class="mt-1 text-sm text-text">{{ getStageLabel(process.stage) }}</p>
                  </div>

                  <!-- Riesgo -->
                  <div>
                    <p class="text-xs font-medium text-subtle uppercase tracking-wide">Riesgo</p>
                    <span class="mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                      [class]="getRiskClasses(process.riskLevel)">
                      {{ getRiskLabel(process.riskLevel) }}
                    </span>
                  </div>
                </div>

                <!-- Asesores y Fecha -->
                <div class="flex flex-wrap items-center gap-4 text-sm">
                  <!-- Asesores -->
                  @if (process.advisors && process.advisors.length > 0) {
                    <div class="flex items-center gap-2">
                      <svg class="h-4 w-4 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                      <div class="flex flex-wrap gap-1">
                        @for (advisor of process.advisors; track advisor.id) {
                          <span class="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-text">
                            {{ advisor.user?.firstName }} {{ advisor.user?.lastName }}
                          </span>
                        }
                      </div>
                    </div>
                  } @else {
                    <div class="flex items-center gap-2 text-subtle">
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                      <span class="text-xs">Sin asesores asignados</span>
                    </div>
                  }

                  <!-- Fecha de actualización -->
                  <div class="flex items-center gap-2 text-subtle">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span class="text-xs">Actualizado {{ formatDate(process.updatedAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>



        <!-- Vista Mobile/Tablet: Cards -->
        <div class="grid gap-4 md:hidden">
          @for (process of processes(); track process.id) {
            <div class="rounded-lg border border-default bg-surface p-4 shadow-card">
              <div class="space-y-3">
                <!-- Título y número de caso -->
                <div>
                  <p class="font-semibold text-text">{{ process.title }}</p>
                  @if (process.caseNumber) {
                    <p class="mt-1 font-mono text-xs text-subtle">{{ process.caseNumber }}</p>
                  }
                </div>

                <!-- Info grid -->
                <div class="grid gap-2 text-sm">
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-xs font-medium text-subtle">Cliente:</span>
                    <span class="text-xs text-text">{{ process.client.fullName || 'Sin cliente' }}</span>
                  </div>
                  
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-xs font-medium text-subtle">Estado:</span>
                    <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                      [class]="getStatusClasses(process.status)">
                      <span class="h-2 w-2 rounded-full" [class]="getStatusDot(process.status)"></span>
                      {{ getStatusLabel(process.status) }}
                    </span>
                  </div>
                  
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-xs font-medium text-subtle">Etapa:</span>
                    <span class="text-xs text-text">{{ getStageLabel(process.stage) }}</span>
                  </div>
                  
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-xs font-medium text-subtle">Riesgo:</span>
                    <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                      [class]="getRiskClasses(process.riskLevel)">
                      {{ getRiskLabel(process.riskLevel) }}
                    </span>
                  </div>
                  
                  @if (process.advisors && process.advisors.length > 0) {
                    <div class="flex items-start justify-between gap-2">
                      <span class="text-xs font-medium text-subtle">Asesores:</span>
                      <div class="flex flex-col items-end gap-1">
                        @for (advisor of process.advisors; track advisor.id) {
                          <span class="text-xs text-text">
                            {{ advisor.user?.firstName }} {{ advisor.user?.lastName }}
                          </span>
                        }
                      </div>
                    </div>
                  }
                  
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-xs font-medium text-subtle">Actualizado:</span>
                    <span class="text-xs text-muted">{{ formatDate(process.updatedAt) }}</span>
                  </div>
                </div>

                <!-- Acciones mobile -->
                <div class="grid grid-cols-2 gap-2 border-t border-default pt-3">
                  <button
                    type="button"
                    (click)="editProcess(process)"
                    class="flex items-center justify-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface-sunken"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 3.487 3.65 3.65a1 1 0 0 1 0 1.415L8.96 20.104a1 1 0 0 1-.708.292H4.5a.75.75 0 0 1-.75-.75v-3.752a1 1 0 0 1 .293-.707L15.447 3.487a1 1 0 0 1 1.415 0Z" />
                    </svg>
                    Editar
                  </button>
                  <button
                    type="button"
                    (click)="openStatusModal(process)"
                    class="flex items-center justify-center gap-2 rounded-md bg-info-tint px-3 py-2 text-xs font-semibold text-info transition hover:opacity-80"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Estado
                  </button>
                  <!-- HU-17: Botón historial -->
                  <button
                    type="button"
                    (click)="openHistoryModal(process)"
                    class="flex items-center justify-center gap-2 rounded-md bg-accent-tint px-3 py-2 text-xs font-semibold text-accent transition hover:opacity-80"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Historial
                  </button>
                  <!-- HU-16: Botón anotación (solo si ACTIVE) -->
                  @if (process.status === ProcessStatus.ACTIVE) {
                    <button
                      type="button"
                      (click)="openAnnotationModal(process)"
                      class="flex items-center justify-center gap-2 rounded-md bg-success-tint px-3 py-2 text-xs font-semibold text-success transition hover:opacity-80"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      Anotar
                    </button>
                  }
                  <button
                    type="button"
                    (click)="deleteProcess(process)"
                    class="flex items-center justify-center gap-2 rounded-md bg-danger-tint px-3 py-2 text-xs font-semibold text-danger transition hover:opacity-80"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Paginación -->
        @if (totalItems() > 0) {
          <app-pagination
            [total]="totalItems()"
            [currentPage]="currentPage()"
            [pageSize]="pageSize"
            [currentItems]="processes().length"
            [totalPages]="totalPages()"
            [itemLabel]="'procesos'"
            (nextPage)="nextPage()"
            (previousPage)="previousPage()"
          />
        }
      }
    </div>
  `,
})
export class ProcessesComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly legalProcessesService = inject(LegalProcessesService);
  private readonly processEventsService = inject(ProcessEventsService);
  private readonly advisorsService = inject(AdvisorsService);
  private readonly clientsService = inject(ClientsService);
  private readonly filesService = inject(FilesService);
  private readonly sanitizer = inject(DomSanitizer);

  private fileDeletedSubscription?: Subscription;

  // Exposed enums for template
  readonly ProcessStatus = ProcessStatus;
  readonly ProcessStage = ProcessStage;
  readonly RiskLevel = RiskLevel;
  readonly ProcessEventType = ProcessEventType;

  // Signal state
  readonly processes = signal<LegalProcessResponse[]>([]);
  readonly advisors = signal<AdvisorResponse[]>([]);
  readonly clients = signal<ClientResponse[]>([]);
  readonly isLoading = signal(false);
  readonly formError = signal<string | null>(null);
  readonly panelOpen = signal(false);
  readonly statusModalOpen = signal(false);
  readonly historyModalOpen = signal(false); // HU-17
  readonly annotationModalOpen = signal(false); // HU-16
  readonly annotationFiles = signal<File[]>([]); // HU-16 - Archivos para adjuntar a anotación
  readonly editingProcess = signal<LegalProcessResponse | null>(null);
  readonly processHistory = signal<ProcessEvent[]>([]); // HU-17
  readonly isLoadingHistory = signal(false); // HU-17
  readonly previewingFile = signal<{ id: string; filename: string; contentType: string } | null>(null);
  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly currentPage = signal(1);
  readonly totalItems = signal(0);

  // Computed signals
  readonly validNextStatuses = computed(() => {
    const process = this.editingProcess();
    return process ? this.getValidNextStatuses(process.status) : [];
  });

  readonly canEditProcess = computed(() => {
    const process = this.editingProcess();
    if (!process) return true; // Nuevo proceso, siempre editable
    const editableStatuses = [ProcessStatus.DRAFT, ProcessStatus.ACTIVE, ProcessStatus.SUSPENDED];
    return editableStatuses.includes(process.status);
  });

  readonly processStatusMessage = computed(() => {
    const process = this.editingProcess();
    if (!process) return null;
    
    switch (process.status) {
      case ProcessStatus.COMPLETED:
        return 'Este proceso está completado. No se pueden realizar cambios.';
      case ProcessStatus.CANCELLED:
        return 'Este proceso está cancelado. No se pueden realizar cambios.';
      case ProcessStatus.ARCHIVED:
        return 'Este proceso está archivado. No se pueden realizar cambios.';
      case ProcessStatus.ACTIVE:
        return 'El número de caso y el cliente no pueden modificarse una vez el proceso está activo.';
      case ProcessStatus.UNDER_REVIEW:
        return 'El proceso está en revisión. Algunas modificaciones están restringidas.';
      case ProcessStatus.SUSPENDED:
        return 'El proceso está suspendido. La etapa no puede modificarse.';
      default:
        return null;
    }
  });

  // HU-16: Solo se pueden agregar anotaciones a procesos ACTIVE
  readonly canAddAnnotation = computed(() => {
    const process = this.editingProcess();
    return process?.status === ProcessStatus.ACTIVE;
  });

  readonly pageSize = 10;

  readonly totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize));

  // Forms
  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: [null as ProcessStatus | null],
    clientId: [null as string | null],
  });


  readonly processForm = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    description: [''],
    clientId: ['', [Validators.required]],
    advisorIds: [[] as string[], []],
    status: [ProcessStatus.DRAFT, [Validators.required]],
    stage: [ProcessStage.INVESTIGATION, [Validators.required]],
    riskLevel: [RiskLevel.MEDIUM, [Validators.required]],
    court: [''],
    caseNumber: [''],
    startDate: [''],
    nextHearingDate: [''],
    endDate: [''],
  });

  readonly statusForm = this.fb.nonNullable.group({
    status: [ProcessStatus.DRAFT, [Validators.required]],
    notes: [''],
  });

  // HU-16: Formulario de anotación
  readonly annotationForm = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  constructor() {
    this.loadProcesses();
    this.loadAdvisors();
    this.loadClients();
  }

  loadProcesses(): void {
    this.isLoading.set(true);
    const filters = this.filterForm.getRawValue();
    
    this.legalProcessesService
      .getLegalProcesses(
        this.currentPage(),
        this.pageSize,
        {
          status: filters.status || undefined,
          clientId: filters.clientId || undefined,
          search: filters.search || undefined,
        }
      )
      .subscribe({
        next: (response) => {
          this.processes.set(response.legalProcesses);
          this.totalItems.set(response.total);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading processes:', error);
          this.formError.set('Error al cargar procesos');
          this.isLoading.set(false);
        },
      });
  }

  loadAdvisors(): void {
    this.advisorsService.getAdvisors(1, 100).subscribe({
      next: (response) => {
        this.advisors.set(response.advisors);
      },
      error: (error) => console.error('Error loading advisors:', error),
    });
  }

  loadClients(): void {
    this.clientsService.getClients(1, 100).subscribe({
      next: (response) => {
        this.clients.set(response.clients);
      },
      error: (error) => console.error('Error loading clients:', error),
    });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadProcesses();
  }

  resetFilters(): void {
    this.filterForm.reset({
      search: '',
      status: null,
      clientId: null,
    });
    this.applyFilters();
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadProcesses();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadProcesses();
    }
  }

  togglePanel(): void {
    if (this.panelOpen()) {
      this.panelOpen.set(false);
      this.editingProcess.set(null);
      this.processForm.reset({
        title: '',
        description: '',
        clientId: '',
        advisorIds: [],
        status: ProcessStatus.DRAFT,
        stage: ProcessStage.INVESTIGATION,
        riskLevel: RiskLevel.MEDIUM,
        court: '',
        caseNumber: '',
        startDate: '',
        nextHearingDate: '',
        endDate: '',
      });
      // Habilitar todos los campos para nuevo proceso
      Object.keys(this.processForm.controls).forEach(key => {
        this.processForm.get(key)?.enable();
      });
      this.formError.set(null);
    } else {
      this.panelOpen.set(true);
    }
  }

  closePanel(event?: MouseEvent): void {
    if (event) {
      // Solo cerrar si se hizo clic en el overlay (fondo)
      return;
    }
    this.togglePanel();
  }

  submitProcess(): void {
    if (this.processForm.invalid) {
      this.processForm.markAllAsTouched();
      this.formError.set('Completa los campos obligatorios.');
      return;
    }

    this.isLoading.set(true);
    this.formError.set(null);
    const formValue = this.processForm.getRawValue();

    // Prepare request
    const baseRequest = {
      title: formValue.title,
      description: formValue.description || undefined,
      stage: formValue.stage,
      riskLevel: formValue.riskLevel,
      court: formValue.court || undefined,
      caseNumber: formValue.caseNumber || undefined,
      startDate: formValue.startDate || undefined,
      nextHearingDate: formValue.nextHearingDate || undefined,
      endDate: formValue.endDate || undefined,
      clientId: formValue.clientId,
      advisorIds: formValue.advisorIds.length > 0 ? formValue.advisorIds : undefined,
    };

    // El estado solo se incluye al crear (siempre DRAFT)
    // Al editar, el estado se cambia mediante el modal dedicado
    const request: CreateLegalProcessRequest | UpdateLegalProcessRequest = this.editingProcess()
      ? baseRequest
      : { ...baseRequest, status: ProcessStatus.DRAFT };

    const operation = this.editingProcess()
      ? this.legalProcessesService.updateLegalProcess(this.editingProcess()!.id, request)
      : this.legalProcessesService.createLegalProcess(request as CreateLegalProcessRequest);

    operation.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.togglePanel();
        this.loadProcesses();
      },
      error: (error) => {
        console.error('Error saving process:', error);
        this.formError.set(error.error?.message || 'Error al guardar el proceso');
        this.isLoading.set(false);
      },
    });
  }

  editProcess(process: LegalProcessResponse): void {
    this.editingProcess.set(process);
    this.processForm.patchValue({
      title: process.title,
      description: process.description || '',
      clientId: process.clientId,
      advisorIds: process.advisors?.map(a => a.id) || [],
      status: process.status,
      stage: process.stage,
      riskLevel: process.riskLevel,
      court: process.court || '',
      caseNumber: process.caseNumber || '',
      startDate: process.startDate ? new Date(process.startDate).toISOString().slice(0, 10) : '',
      nextHearingDate: process.nextHearingDate ? new Date(process.nextHearingDate).toISOString().slice(0, 10) : '',
      endDate: process.endDate ? new Date(process.endDate).toISOString().slice(0, 10) : '',
    });
    this.configureEditableFields(process.status);
    this.panelOpen.set(true);
  }

  openStatusModal(process: LegalProcessResponse): void {
    this.editingProcess.set(process);
    this.statusForm.patchValue({
      status: process.status,
      notes: '',
    });
    this.statusModalOpen.set(true);
  }

  closeStatusModal(event?: MouseEvent): void {
    if (event) {
      return;
    }
    this.statusModalOpen.set(false);
    this.editingProcess.set(null);
    this.statusForm.reset();
    this.formError.set(null);
  }

  // HU-17: Abrir modal de historial
  openHistoryModal(process: LegalProcessResponse): void {
    this.editingProcess.set(process);
    this.historyModalOpen.set(true);
    this.loadProcessHistory(process.id);
  }

  // HU-17: Cerrar modal de historial
  closeHistoryModal(event?: MouseEvent): void {
    if (event) {
      return;
    }
    this.historyModalOpen.set(false);
    this.editingProcess.set(null);
    this.processHistory.set([]);
  }

  // HU-17: Cargar historial del proceso
  loadProcessHistory(processId: string): void {
    this.isLoadingHistory.set(true);
    this.processEventsService.getProcessHistory(processId).subscribe({
      next: (events) => {
        this.processHistory.set(events);
        this.isLoadingHistory.set(false);
      },
      error: (error) => {
        console.error('Error loading process history:', error);
        this.isLoadingHistory.set(false);
      },
    });
  }

  // HU-16: Abrir modal de anotación
  openAnnotationModal(process: LegalProcessResponse): void {
    this.editingProcess.set(process);
    this.annotationModalOpen.set(true);
    this.annotationForm.reset();
    this.annotationFiles.set([]);
  }

  // HU-16: Cerrar modal de anotación
  closeAnnotationModal(event?: MouseEvent): void {
    if (event) {
      return;
    }
    this.annotationModalOpen.set(false);
    this.editingProcess.set(null);
    this.annotationForm.reset();
    this.annotationFiles.set([]);
    this.formError.set(null);
  }

  // HU-16: Manejar selección de archivos
  onAnnotationFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      this.annotationFiles.set([...this.annotationFiles(), ...filesArray]);
    }
  }

  // HU-16: Remover archivo de la lista
  removeAnnotationFile(index: number): void {
    const files = this.annotationFiles();
    files.splice(index, 1);
    this.annotationFiles.set([...files]);
  }

  // HU-16: Formatear tamaño de archivo
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // HU-16: Crear anotación y subir archivos
  submitAnnotation(): void {
    if (this.annotationForm.invalid || !this.editingProcess()) {
      return;
    }

    this.isLoading.set(true);
    this.formError.set(null);
    const description = this.annotationForm.getRawValue().description;
    const processId = this.editingProcess()!.id;

    // Primero crear la anotación
    this.processEventsService
      .createAnnotation(processId, description)
      .pipe(
        // Luego subir archivos si hay, vinculándolos a la anotación creada
        switchMap((annotationEvent) => {
          const files = this.annotationFiles();
          if (files.length === 0) {
            return of(null);
          }
          // Obtener el ID del evento de anotación creado
          const annotationEventId = annotationEvent.id;
          // Subir todos los archivos en paralelo, vinculados a la anotación
          const uploads = files.map(file =>
            this.filesService.uploadFile(file, 'legal_process', processId, undefined, annotationEventId)
          );
          return forkJoin(uploads);
        })
      )
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.closeAnnotationModal();
          // Recargar historial si está abierto
          if (this.historyModalOpen()) {
            this.loadProcessHistory(processId);
          }
        },
        error: (error) => {
          console.error('Error creating annotation:', error);
          this.formError.set(error.error?.message || 'Error al crear anotación o subir archivos');
          this.isLoading.set(false);
        },
      });
  }

  updateStatus(): void {
    if (this.statusForm.invalid || !this.editingProcess()) {
      return;
    }

    this.isLoading.set(true);
    this.formError.set(null);
    const request: UpdateProcessStatusRequest = this.statusForm.getRawValue();

    this.legalProcessesService
      .updateProcessStatus(this.editingProcess()!.id, request)
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.closeStatusModal();
          this.loadProcesses();
        },
        error: (error) => {
          console.error('Error updating status:', error);
          this.formError.set(error.error?.message || 'Error al actualizar el estado');
          this.isLoading.set(false);
        },
      });
  }

  deleteProcess(process: LegalProcessResponse): void {
    if (!confirm(`¿Estás seguro de eliminar el proceso "${process.title}"?`)) {
      return;
    }

    this.isLoading.set(true);
    this.legalProcessesService.deleteLegalProcess(process.id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.loadProcesses();
      },
      error: (error) => {
        console.error('Error deleting process:', error);
        alert('Error al eliminar el proceso');
        this.isLoading.set(false);
      },
    });
  }

  // Label helpers
  getStatusLabel(status: ProcessStatus): string {
    const labels: Record<ProcessStatus, string> = {
      [ProcessStatus.DRAFT]: 'Borrador',
      [ProcessStatus.ACTIVE]: 'Activo',
      [ProcessStatus.UNDER_REVIEW]: 'En Revisión',
      [ProcessStatus.SUSPENDED]: 'Suspendido',
      [ProcessStatus.COMPLETED]: 'Completado',
      [ProcessStatus.CANCELLED]: 'Cancelado',
      [ProcessStatus.ARCHIVED]: 'Archivado',
    };
    return labels[status] || status;
  }

  getStageLabel(stage: ProcessStage): string {
    const labels: Record<ProcessStage, string> = {
      [ProcessStage.INVESTIGATION]: 'Investigación',
      [ProcessStage.HEARING]: 'Audiencia',
      [ProcessStage.NOTIFICATION]: 'Notificación',
      [ProcessStage.EXECUTION]: 'Ejecución',
    };
    return labels[stage] || stage;
  }

  getRiskLabel(risk: RiskLevel): string {
    const labels: Record<RiskLevel, string> = {
      [RiskLevel.LOW]: 'Bajo',
      [RiskLevel.MEDIUM]: 'Medio',
      [RiskLevel.HIGH]: 'Alto',
    };
    return labels[risk] || risk;
  }

  // Styling helpers
  getStatusClasses(status: ProcessStatus): string {
    const classes: Record<ProcessStatus, string> = {
      [ProcessStatus.DRAFT]: 'bg-surface-muted text-text',
      [ProcessStatus.ACTIVE]: 'bg-info-tint text-info',
      [ProcessStatus.UNDER_REVIEW]: 'bg-warning-tint text-warning',
      [ProcessStatus.SUSPENDED]: 'bg-orange-100 text-orange-700',
      [ProcessStatus.COMPLETED]: 'bg-success-tint text-success',
      [ProcessStatus.CANCELLED]: 'bg-danger-tint text-danger',
      [ProcessStatus.ARCHIVED]: 'bg-surface-muted text-subtle',
    };
    return classes[status] || 'bg-surface-muted text-text';
  }

  getStatusDot(status: ProcessStatus): string {
    const classes: Record<ProcessStatus, string> = {
      [ProcessStatus.DRAFT]: 'bg-subtle',
      [ProcessStatus.ACTIVE]: 'bg-primary',
      [ProcessStatus.UNDER_REVIEW]: 'bg-warning',
      [ProcessStatus.SUSPENDED]: 'bg-orange-500',
      [ProcessStatus.COMPLETED]: 'bg-success',
      [ProcessStatus.CANCELLED]: 'bg-danger',
      [ProcessStatus.ARCHIVED]: 'bg-strong',
    };
    return classes[status] || 'bg-subtle';
  }

  getRiskClasses(risk: RiskLevel): string {
    const classes: Record<RiskLevel, string> = {
      [RiskLevel.LOW]: 'bg-success-tint text-success',
      [RiskLevel.MEDIUM]: 'bg-warning-tint text-warning',
      [RiskLevel.HIGH]: 'bg-danger-tint text-danger',
    };
    return classes[risk] || 'bg-surface-muted text-text';
  }

  // Workflow helpers
  configureEditableFields(status: ProcessStatus): void {
    // Habilitar todos los campos primero
    Object.keys(this.processForm.controls).forEach(key => {
      this.processForm.get(key)?.enable();
    });

    // Configurar restricciones según el estado
    switch (status) {
      case ProcessStatus.DRAFT:
        // En borrador, todos los campos son editables
        break;

      case ProcessStatus.ACTIVE:
        // En activo, no se puede cambiar el número de caso ni el cliente
        this.processForm.get('caseNumber')?.disable();
        this.processForm.get('clientId')?.disable();
        break;

      case ProcessStatus.UNDER_REVIEW:
        // En revisión, no se puede cambiar caso, cliente (más restrictivo que activo)
        this.processForm.get('caseNumber')?.disable();
        this.processForm.get('clientId')?.disable();
        this.processForm.get('status')?.disable(); // Evitar cambio directo de estado
        break;

      case ProcessStatus.SUSPENDED:
        // Suspendido, no se puede cambiar caso, cliente, ni etapa
        this.processForm.get('caseNumber')?.disable();
        this.processForm.get('clientId')?.disable();
        this.processForm.get('stage')?.disable();
        break;

      case ProcessStatus.COMPLETED:
      case ProcessStatus.CANCELLED:
      case ProcessStatus.ARCHIVED:
        // Procesos finalizados no son editables
        Object.keys(this.processForm.controls).forEach(key => {
          this.processForm.get(key)?.disable();
        });
        break;
    }
  }

  getValidNextStatuses(currentStatus: ProcessStatus): ProcessStatus[] {
    const validTransitions: Record<ProcessStatus, ProcessStatus[]> = {
      [ProcessStatus.DRAFT]: [ProcessStatus.ACTIVE, ProcessStatus.CANCELLED],
      [ProcessStatus.ACTIVE]: [ProcessStatus.UNDER_REVIEW, ProcessStatus.SUSPENDED, ProcessStatus.CANCELLED],
      [ProcessStatus.UNDER_REVIEW]: [ProcessStatus.ACTIVE, ProcessStatus.COMPLETED, ProcessStatus.CANCELLED],
      [ProcessStatus.SUSPENDED]: [ProcessStatus.ACTIVE, ProcessStatus.CANCELLED],
      [ProcessStatus.COMPLETED]: [ProcessStatus.ARCHIVED],
      [ProcessStatus.CANCELLED]: [],
      [ProcessStatus.ARCHIVED]: [],
    };
    return validTransitions[currentStatus] || [];
  }

  isAdvisorSelected(advisorId: string): boolean {
    const selectedIds = this.processForm.get('advisorIds')?.value || [];
    return selectedIds.includes(advisorId);
  }

  toggleAdvisor(advisorId: string): void {
    const currentIds = this.processForm.get('advisorIds')?.value || [];
    const index = currentIds.indexOf(advisorId);
    
    if (index > -1) {
      // Remover el ID
      this.processForm.patchValue({
        advisorIds: currentIds.filter((id: string) => id !== advisorId)
      });
    } else {
      // Agregar el ID
      this.processForm.patchValue({
        advisorIds: [...currentIds, advisorId]
      });
    }
  }

  generateCaseNumber(): void {
    // Formato: PROC-YYYY-NNNNNN
    // PROC: Prefijo (configurable por empresa en futuro)
    // YYYY: Año actual
    // NNNNNN: Número secuencial basado en timestamp
    const year = new Date().getFullYear();
    const sequence = Date.now().toString().slice(-6);
    const caseNumber = `PROC-${year}-${sequence}`;
    
    this.processForm.patchValue({ caseNumber });
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  // HU-17: Helper methods para timeline de eventos
  getEventIcon(type: ProcessEventType): string {
    switch (type) {
      case ProcessEventType.ANNOTATION:
        return 'm16.862 3.487 3.65 3.65a1 1 0 0 1 0 1.415L8.96 20.104a1 1 0 0 1-.708.292H4.5a.75.75 0 0 1-.75-.75v-3.752a1 1 0 0 1 .293-.707L15.447 3.487a1 1 0 0 1 1.415 0Z';
      case ProcessEventType.STATUS_CHANGE:
        return 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99';
      case ProcessEventType.ADVISOR_ASSIGNED:
        return 'M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z';
      case ProcessEventType.ADVISOR_REMOVED:
        return 'M15 9.75h3m3 0h-3m0 0h-3m3 0v3m0-3v-3m-8.625.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z';
      case ProcessEventType.PROCESS_CREATED:
        return 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z';
      case ProcessEventType.PROCESS_UPDATED:
        return 'm14.362 5.214 2.909 2.909M14.362 5.214 3.75 15.826l-1.5 4.874 4.874-1.5L17.336 8.588m-2.974-3.374L17.336 8.588M17.336 8.588l2.926-2.926a1.875 1.875 0 1 0-2.652-2.652l-2.926 2.926';
      case ProcessEventType.CLIENT_CHANGED:
        return 'M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5';
      case ProcessEventType.DOCUMENT_UPLOADED:
        return 'm18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13';
      default:
        return 'M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z';
    }
  }

  getEventColor(type: ProcessEventType): string {
    switch (type) {
      case ProcessEventType.ANNOTATION:
        return 'bg-info-tint text-primary';
      case ProcessEventType.STATUS_CHANGE:
        return 'bg-accent-tint text-accent';
      case ProcessEventType.ADVISOR_ASSIGNED:
        return 'bg-success-tint text-success';
      case ProcessEventType.ADVISOR_REMOVED:
        return 'bg-orange-100 text-orange-600';
      case ProcessEventType.PROCESS_CREATED:
        return 'bg-success-tint text-success';
      case ProcessEventType.PROCESS_UPDATED:
        return 'bg-warning-tint text-warning';
      case ProcessEventType.CLIENT_CHANGED:
        return 'bg-accent-tint text-accent';
      case ProcessEventType.DOCUMENT_UPLOADED:
        return 'bg-cyan-100 text-cyan-600';
      default:
        return 'bg-surface-muted text-muted';
    }
  }

  getEventLabel(type: ProcessEventType): string {
    switch (type) {
      case ProcessEventType.ANNOTATION:
        return 'Anotación';
      case ProcessEventType.STATUS_CHANGE:
        return 'Cambio de estado';
      case ProcessEventType.ADVISOR_ASSIGNED:
        return 'Asesor asignado';
      case ProcessEventType.ADVISOR_REMOVED:
        return 'Asesor removido';
      case ProcessEventType.PROCESS_CREATED:
        return 'Proceso creado';
      case ProcessEventType.PROCESS_UPDATED:
        return 'Proceso actualizado';
      case ProcessEventType.CLIENT_CHANGED:
        return 'Cliente cambiado';
      case ProcessEventType.DOCUMENT_UPLOADED:
        return 'Documento cargado';
      default:
        return 'Evento';
    }
  }

  // Descargar archivo desde el historial
  downloadFile(fileId: string): void {
    this.filesService.downloadFile(fileId).subscribe({
      next: () => {
        console.log('Descarga iniciada');
      },
      error: (error) => {
        console.error('Error al descargar archivo:', error);
        alert('Error al descargar el archivo');
      },
    });
  }

  // Preview file from history
  previewFileFromHistory(fileId: string, filename: string): void {
    this.filesService.getDownloadUrl(fileId).subscribe({
      next: (response) => {
        const contentType = this.getContentTypeFromFilename(filename);
        this.previewingFile.set({ id: fileId, filename, contentType });
        this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(response.url));
      },
      error: (error) => {
        console.error('Error al obtener URL del archivo:', error);
        alert('Error al cargar vista previa del archivo');
      },
    });
  }

  // Close preview modal
  closePreviewModal(): void {
    this.previewingFile.set(null);
    this.previewUrl.set(null);
  }

  // Helper: Get content type from filename
  private getContentTypeFromFilename(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return contentTypes[extension] || 'application/octet-stream';
  }

  // Helper: Check if content type is image
  isImageContentType(contentType: string): boolean {
    return contentType.startsWith('image/');
  }

  // Helper: Check if content type is PDF
  isPdfContentType(contentType: string): boolean {
    return contentType === 'application/pdf';
  }

  // Lifecycle hooks
  ngOnInit(): void {
    // Suscribirse a eventos de eliminación de archivos para sincronizar vistas
    this.fileDeletedSubscription = this.filesService.fileDeleted$.subscribe(() => {
      // Si el modal de historial está abierto, recargar el historial del proceso actual
      if (this.historyModalOpen() && this.editingProcess()) {
        this.loadProcessHistory(this.editingProcess()!.id);
      }
    });
  }

  ngOnDestroy(): void {
    // Limpiar suscripción para evitar memory leaks
    this.fileDeletedSubscription?.unsubscribe();
  }
}
