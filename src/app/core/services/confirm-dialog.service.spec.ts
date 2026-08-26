import { TestBed } from '@angular/core/testing';
import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfirmDialogService);
  });

  it('empieza sin diálogo activo', () => {
    expect(service.current()).toBeNull();
  });

  it('confirm publica las opciones en el estado y queda pendiente hasta respond', async () => {
    let resolved: boolean | undefined;
    const promise = service.confirm({ title: 'Eliminar', message: '¿Confirmas?' }).then((v) => (resolved = v));

    const state = service.current();
    expect(state).not.toBeNull();
    expect(state?.title).toBe('Eliminar');
    expect(state?.message).toBe('¿Confirmas?');
    expect(resolved).toBeUndefined();

    service.respond(true);
    await promise;

    expect(resolved).toBe(true);
  });

  it('respond(true) resuelve la promesa con true y limpia el estado', async () => {
    const promise = service.confirm({ title: 't', message: 'm' });

    service.respond(true);

    await expect(promise).resolves.toBe(true);
    expect(service.current()).toBeNull();
  });

  it('respond(false) resuelve la promesa con false y limpia el estado', async () => {
    const promise = service.confirm({ title: 't', message: 'm' });

    service.respond(false);

    await expect(promise).resolves.toBe(false);
    expect(service.current()).toBeNull();
  });

  it('respond sin diálogo activo no lanza error ni cambia el estado', () => {
    expect(() => service.respond(true)).not.toThrow();
    expect(service.current()).toBeNull();
  });

  it('preserva las opciones opcionales (confirmLabel, cancelLabel, danger)', () => {
    service.confirm({
      title: 'Eliminar usuario',
      message: 'Esta acción no se puede deshacer',
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'Cancelar',
      danger: true,
    });

    const state = service.current();
    expect(state?.confirmLabel).toBe('Sí, eliminar');
    expect(state?.cancelLabel).toBe('Cancelar');
    expect(state?.danger).toBe(true);
  });

  it('una nueva llamada a confirm reemplaza el diálogo activo', () => {
    service.confirm({ title: 'Primero', message: 'm1' });
    service.confirm({ title: 'Segundo', message: 'm2' });

    expect(service.current()?.title).toBe('Segundo');
  });
});
