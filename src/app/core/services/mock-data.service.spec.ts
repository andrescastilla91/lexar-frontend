import { TestBed } from '@angular/core/testing';
import { MockDataService } from './mock-data.service';
import { Advisor } from '../models/advisor.model';
import { Client } from '../models/client.model';
import { LegalProcess } from '../models/legal-process.model';
import { LegalDocument } from '../models/document.model';
import { ChatMessage } from '../models/chat-message.model';

describe('MockDataService', () => {
  let service: MockDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockDataService);
  });

  it('expone datos semilla de asesores, clientes, procesos y documentos', () => {
    expect(service.advisors().length).toBe(4);
    expect(service.clients().length).toBe(4);
    expect(service.processes().length).toBe(4);
    expect(service.documents().length).toBe(3);
    expect(service.chatHistory().length).toBe(4);
  });

  it('addAdvisor agrega un asesor al inicio de la colección y le asigna un id', () => {
    const payload: Omit<Advisor, 'id'> = {
      name: 'Nuevo Asesor',
      email: 'nuevo@lexar.com',
      phone: '3000000000',
      specialty: 'Derecho Penal',
      status: 'Disponible',
      rating: 5,
      experienceYears: 2,
    };

    const created = service.addAdvisor(payload);

    expect(created.id).toBeTruthy();
    expect(service.advisors()[0]).toEqual(created);
    expect(service.advisors().length).toBe(5);
  });

  it('addClient agrega un cliente al inicio de la colección y le asigna un id', () => {
    const payload: Omit<Client, 'id'> = {
      name: 'Cliente Nuevo',
      company: 'Cliente Nuevo S.A.S.',
      email: 'nuevo@cliente.com',
      phone: '3000000001',
      createdAt: '2026-01-01',
      assignedAdvisorId: service.advisors()[0].id,
      riskLevel: 'Bajo',
    };

    const created = service.addClient(payload);

    expect(created.id).toBeTruthy();
    expect(service.clients()[0]).toEqual(created);
    expect(service.clients().length).toBe(5);
  });

  it('addProcess agrega un proceso al inicio de la colección y le asigna un id', () => {
    const payload: Omit<LegalProcess, 'id'> = {
      title: 'Proceso nuevo',
      court: 'Juzgado 1',
      clientId: service.clients()[0].id,
      advisorId: service.advisors()[0].id,
      status: 'En curso',
      stage: 'Investigación',
      riskLevel: 'Bajo',
      nextHearingDate: '2026-12-01',
      updatedAt: '2026-01-01',
    };

    const created = service.addProcess(payload);

    expect(created.id).toBeTruthy();
    expect(service.processes()[0]).toEqual(created);
    expect(service.processes().length).toBe(5);
  });

  it('addDocument agrega un documento al inicio de la colección y le asigna un id', () => {
    const payload: Omit<LegalDocument, 'id'> = {
      processId: service.processes()[0].id,
      title: 'Documento nuevo',
      category: 'Otro',
      uploadedBy: 'Tester',
      uploadedAt: '2026-01-01',
      status: 'Pendiente',
      fileName: 'nuevo.pdf',
    };

    const created = service.addDocument(payload);

    expect(created.id).toBeTruthy();
    expect(service.documents()[0]).toEqual(created);
    expect(service.documents().length).toBe(4);
  });

  it('addChatMessage agrega el mensaje al final del historial', () => {
    const message: ChatMessage = {
      id: 'msg-nuevo',
      author: 'usuario',
      content: 'Hola',
      timestamp: '2026-01-01T00:00:00Z',
    };

    service.addChatMessage(message);

    const history = service.chatHistory();
    expect(history[history.length - 1]).toEqual(message);
    expect(history.length).toBe(5);
  });

  it('findAdvisorById retorna el asesor cuando existe', () => {
    const first = service.advisors()[0];
    expect(service.findAdvisorById(first.id)).toEqual(first);
  });

  it('findAdvisorById retorna undefined cuando no existe', () => {
    expect(service.findAdvisorById('inexistente')).toBeUndefined();
  });

  it('findClientById retorna el cliente cuando existe', () => {
    const first = service.clients()[0];
    expect(service.findClientById(first.id)).toEqual(first);
  });

  it('findClientById retorna undefined cuando no existe', () => {
    expect(service.findClientById('inexistente')).toBeUndefined();
  });

  it('findProcessById retorna el proceso cuando existe', () => {
    const first = service.processes()[0];
    expect(service.findProcessById(first.id)).toEqual(first);
  });

  it('findProcessById retorna undefined cuando no existe', () => {
    expect(service.findProcessById('inexistente')).toBeUndefined();
  });

  it('dashboardSnapshot calcula totales y procesos de alto riesgo de la semilla', () => {
    const snapshot = service.dashboardSnapshot();

    expect(snapshot.totalClients).toBe(4);
    expect(snapshot.totalProcesses).toBe(4);
    expect(snapshot.activeAdvisors).toBe(3);
    expect(snapshot.highRiskProcesses).toHaveLength(1);
    expect(snapshot.highRiskProcesses[0].title).toBe('Proceso ejecutivo hipotecario');
  });

  it('dashboardSnapshot incluye en hearingsThisMonth los procesos cuya audiencia cae en el mes/año actual', () => {
    const now = new Date();
    const currentMonthIso = new Date(now.getFullYear(), now.getMonth(), 15).toISOString().slice(0, 10);

    const created = service.addProcess({
      title: 'Audiencia de este mes',
      court: 'Juzgado X',
      clientId: service.clients()[0].id,
      advisorId: service.advisors()[0].id,
      status: 'En curso',
      stage: 'Audiencia',
      riskLevel: 'Bajo',
      nextHearingDate: currentMonthIso,
      updatedAt: currentMonthIso,
    });

    const snapshot = service.dashboardSnapshot();

    expect(snapshot.hearingsThisMonth.some((p) => p.id === created.id)).toBe(true);
  });

  it('dashboardSnapshot excluye procesos cuya audiencia no cae en el mes actual', () => {
    const created = service.addProcess({
      title: 'Audiencia lejana',
      court: 'Juzgado Y',
      clientId: service.clients()[0].id,
      advisorId: service.advisors()[0].id,
      status: 'En curso',
      stage: 'Audiencia',
      riskLevel: 'Bajo',
      nextHearingDate: '2099-01-01',
      updatedAt: '2099-01-01',
    });

    const snapshot = service.dashboardSnapshot();

    expect(snapshot.hearingsThisMonth.some((p) => p.id === created.id)).toBe(false);
  });
});
