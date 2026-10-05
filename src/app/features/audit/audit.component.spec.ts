import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuditComponent } from './audit.component';
import { AuditService } from '../../core/services/audit.service';
import { UsersService } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { AuditLogEntry } from '../../core/models/audit-log.model';

function buildEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: 'log-1',
    action: 'download',
    entityType: 'file',
    entityId: 'file-1',
    userId: 'user-1',
    userEmail: 'maria@example.com',
    detail: null,
    ip: null,
    userAgent: null,
    createdAt: '2026-09-29T10:00:00.000Z',
    description: 'María Gómez descargó documento "Poder.pdf"',
    actionLabel: 'descargó',
    entityTypeLabel: 'documento',
    ...overrides,
  };
}

describe('AuditComponent', () => {
  let auditServiceMock: { findAll: jest.Mock; exportCsv: jest.Mock };
  let usersServiceMock: { getAssignableUsers: jest.Mock };
  let toastMock: { error: jest.Mock; success: jest.Mock };

  function configure(): void {
    auditServiceMock = {
      findAll: jest.fn().mockReturnValue(
        of({ logs: [buildEntry()], total: 1, page: 1, limit: 20 }),
      ),
      exportCsv: jest.fn(),
    };
    usersServiceMock = {
      getAssignableUsers: jest.fn().mockReturnValue(
        of({ message: 'ok', users: [] }),
      ),
    };
    toastMock = { error: jest.fn(), success: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AuditComponent],
      providers: [
        provideRouter([]),
        { provide: AuditService, useValue: auditServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: ToastService, useValue: toastMock },
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(true),
            hasPermission: jest.fn().mockReturnValue(true),
            userPermissions: signal(['audit.view']),
          },
        },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('al inicializar, pide la primera página con filtros vacíos', () => {
    configure();
    const { component } = createComponent();

    expect(auditServiceMock.findAll).toHaveBeenCalledWith(
      { from: undefined, to: undefined, userId: undefined, action: undefined, entityType: undefined },
      1,
      20,
    );
    expect(component.entries()).toHaveLength(1);
    expect(component.total()).toBe(1);
  });

  it('pinta la description ya traducida, nunca el action crudo', () => {
    configure();
    const { fixture } = createComponent();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('María Gómez descargó documento "Poder.pdf"');
  });

  it('cambiar un filtro vuelve a pedir desde la página 1', () => {
    configure();
    const { component } = createComponent();
    auditServiceMock.findAll.mockClear();

    component.action = 'login';
    component.applyFilters();

    expect(auditServiceMock.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'login' }),
      1,
      20,
    );
  });

  // BUG-31: la fila solo mostraba Fecha/Evento — se agrega un detalle
  // expandible con actor, IP, user-agent, tipo/ID de entidad y el detail
  // crudo, sin que el frontend reimplemente ninguna traducción.
  it('al hacer clic en una fila, expande el detalle con IP, user-agent, entidad y el detail crudo', () => {
    configure();
    auditServiceMock.findAll.mockReturnValue(
      of({
        logs: [
          buildEntry({
            ip: '190.0.0.1',
            userAgent: 'Mozilla/5.0',
            entityId: 'file-1',
            detail: { originalFilename: 'Poder.pdf' },
          }),
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    );
    const { fixture, component } = createComponent();

    expect(component.isExpanded('log-1')).toBe(false);
    component.toggleExpand('log-1');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.isExpanded('log-1')).toBe(true);
    expect(text).toContain('190.0.0.1');
    expect(text).toContain('Mozilla/5.0');
    expect(text).toContain('file-1');
    expect(text).toContain('originalFilename');
    expect(text).toContain('Poder.pdf');
  });

  it('exportCsv en error muestra el mensaje real vía toast, no uno genérico fijo', () => {
    configure();
    auditServiceMock.exportCsv.mockReturnValue(
      throwError(() => new Error('El filtro actual arroja 60000 registros.')),
    );
    const { component } = createComponent();

    component.exportCsv();

    expect(toastMock.error).toHaveBeenCalledWith(
      'El filtro actual arroja 60000 registros.',
    );
    expect(component.exporting()).toBe(false);
  });
});

describe('AuditComponent — pestañas de cumplimiento (F44 ola 5)', () => {
  it('muestra las pestañas hacia aceptaciones y autorizaciones', () => {
    TestBed.configureTestingModule({
      imports: [AuditComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuditService,
          useValue: {
            findAll: jest.fn().mockReturnValue(of({ logs: [], total: 0, page: 1, limit: 20 })),
            exportCsv: jest.fn(),
          },
        },
        { provide: UsersService, useValue: { getAssignableUsers: jest.fn().mockReturnValue(of({ message: 'ok', users: [] })) } },
        { provide: ToastService, useValue: { error: jest.fn(), success: jest.fn() } },
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(true),
            hasPermission: jest.fn().mockReturnValue(true),
            userPermissions: signal(['audit.view']),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();

    const hrefs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-audit-tabs a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/auditoria', '/auditoria/aceptaciones', '/auditoria/autorizaciones']);
  });
});
