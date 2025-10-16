import { Injectable, Signal, computed, signal } from '@angular/core';
import { Advisor } from '../models/advisor.model';
import { Client } from '../models/client.model';
import { LegalProcess } from '../models/legal-process.model';
import { LegalDocument } from '../models/document.model';
import { ChatMessage } from '../models/chat-message.model';
import { createId } from '../utils/id.util';

interface AdvisorPayload extends Omit<Advisor, 'id'> {}
interface ClientPayload extends Omit<Client, 'id'> {}
interface ProcessPayload extends Omit<LegalProcess, 'id'> {}
interface DocumentPayload extends Omit<LegalDocument, 'id'> {}

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly advisorsSignal = signal<Advisor[]>([
    {
      id: createId(),
      name: 'Laura Gómez',
      email: 'lgomez@lexar.com',
      phone: '+57 310 555 2874',
      specialty: 'Derecho Corporativo',
      status: 'Disponible',
      rating: 4.9,
      experienceYears: 11,
    },
    {
      id: createId(),
      name: 'Carlos Hernández',
      email: 'chernandez@lexar.com',
      phone: '+57 320 777 1987',
      specialty: 'Litigios Civiles',
      status: 'En audiencia',
      rating: 4.7,
      experienceYears: 9,
    },
    {
      id: createId(),
      name: 'Diana Ríos',
      email: 'drios@lexar.com',
      phone: '+57 312 443 9087',
      specialty: 'Derecho Laboral',
      status: 'Disponible',
      rating: 4.8,
      experienceYears: 12,
    },
    {
      id: createId(),
      name: 'Sebastián Cruz',
      email: 'scruz@lexar.com',
      phone: '+57 315 882 1145',
      specialty: 'Contratación Pública',
      status: 'En reunión',
      rating: 4.6,
      experienceYears: 7,
    },
  ]);

  private readonly clientsSignal = signal<Client[]>([
    {
      id: createId(),
      name: 'Industria Midas S.A.',
      company: 'Industria Midas S.A.',
      email: 'juridica@midas.com',
      phone: '+57 601 445 7788',
      createdAt: '2024-05-18',
      assignedAdvisorId: this.advisorsSignal()[0].id,
      riskLevel: 'Medio',
    },
    {
      id: createId(),
      name: 'Fundación Vida Digna',
      company: 'Fundación Vida Digna',
      email: 'contacto@vidadigna.org',
      phone: '+57 604 331 2255',
      createdAt: '2024-03-02',
      assignedAdvisorId: this.advisorsSignal()[2].id,
      riskLevel: 'Bajo',
    },
    {
      id: createId(),
      name: 'Banco Andino',
      company: 'Banco Andino',
      email: 'asesoria@bancoandino.com',
      phone: '+57 601 777 0199',
      createdAt: '2023-11-21',
      assignedAdvisorId: this.advisorsSignal()[1].id,
      riskLevel: 'Alto',
    },
    {
      id: createId(),
      name: 'Aerolíneas del Caribe',
      company: 'Aerolíneas del Caribe',
      email: 'legal@aerocaribe.com',
      phone: '+57 316 992 4410',
      createdAt: '2024-07-09',
      assignedAdvisorId: this.advisorsSignal()[3].id,
      riskLevel: 'Medio',
    },
  ]);

  private readonly processesSignal = signal<LegalProcess[]>([
    {
      id: createId(),
      title: 'Demanda civil por incumplimiento de contrato',
      clientId: this.clientsSignal()[0].id,
      advisorId: this.advisorsSignal()[1].id,
      status: 'En curso',
      stage: 'Audiencia',
      riskLevel: 'Medio',
      nextHearingDate: '2024-11-02',
      updatedAt: '2024-09-28',
      court: 'Juzgado 15 Civil del Circuito de Bogotá',
    },
    {
      id: createId(),
      title: 'Negociación colectiva - trabajadores fundación',
      clientId: this.clientsSignal()[1].id,
      advisorId: this.advisorsSignal()[2].id,
      status: 'En curso',
      stage: 'Notificación',
      riskLevel: 'Bajo',
      nextHearingDate: '2024-10-24',
      updatedAt: '2024-09-29',
      court: 'Ministerio de Trabajo - Bogotá',
    },
    {
      id: createId(),
      title: 'Proceso ejecutivo hipotecario',
      clientId: this.clientsSignal()[2].id,
      advisorId: this.advisorsSignal()[0].id,
      status: 'En riesgo',
      stage: 'Investigación',
      riskLevel: 'Alto',
      nextHearingDate: '2024-10-18',
      updatedAt: '2024-10-10',
      court: 'Juzgado 8 Civil Municipal de Bogotá',
    },
    {
      id: createId(),
      title: 'Licitation pública Aeropuerto del Norte',
      clientId: this.clientsSignal()[3].id,
      advisorId: this.advisorsSignal()[3].id,
      status: 'En revisión',
      stage: 'Ejecución',
      riskLevel: 'Medio',
      nextHearingDate: '2024-11-14',
      updatedAt: '2024-09-19',
      court: 'Agencia Nacional de Infraestructura',
    },
  ]);

  private readonly documentsSignal = signal<LegalDocument[]>([
    {
      id: createId(),
      processId: this.processesSignal()[0].id,
      title: 'Contrato marco de suministro',
      category: 'Contrato',
      uploadedBy: 'Carlos Hernández',
      uploadedAt: '2024-09-02',
      status: 'Validado',
      notes: 'Documento firmado y sellado por ambas partes.',
      fileName: 'contrato_midas.pdf',
    },
    {
      id: createId(),
      processId: this.processesSignal()[2].id,
      title: 'Certificación de avalúo comercial',
      category: 'Prueba',
      uploadedBy: 'Laura Gómez',
      uploadedAt: '2024-10-05',
      status: 'Pendiente',
      notes: 'Revisión en curso por parte del área técnica.',
      fileName: 'avaluo_hipotecario.pdf',
    },
    {
      id: createId(),
      processId: this.processesSignal()[1].id,
      title: 'Acta de reunión comité laboral',
      category: 'Acta',
      uploadedBy: 'Diana Ríos',
      uploadedAt: '2024-09-25',
      status: 'Validado',
      fileName: 'acta_comite.pdf',
    },
  ]);

  private readonly chatSignal = signal<ChatMessage[]>([
    {
      id: createId(),
      author: 'usuario',
      content: 'Necesito un resumen del estado actual del proceso ejecutivo hipotecario.',
      timestamp: '2024-10-12T09:12:00Z',
      relatedProcessId: this.processesSignal()[2].id,
      sentiment: 'neutral',
    },
    {
      id: createId(),
      author: 'asistente',
      content: 'El proceso se encuentra en etapa de investigación con audiencia programada para el 18 de octubre. El riesgo está catalogado como alto debido a las garantías involucradas.',
      timestamp: '2024-10-12T09:12:15Z',
      relatedProcessId: this.processesSignal()[2].id,
      sentiment: 'positivo',
    },
    {
      id: createId(),
      author: 'usuario',
      content: '¿Qué documentos están pendientes para ese proceso?',
      timestamp: '2024-10-12T09:13:00Z',
      relatedProcessId: this.processesSignal()[2].id,
      sentiment: 'neutral',
    },
    {
      id: createId(),
      author: 'asistente',
      content: 'La certificación de avalúo comercial se encuentra pendiente de revisión. Se recomienda validar observaciones antes del 15 de octubre.',
      timestamp: '2024-10-12T09:13:22Z',
      relatedProcessId: this.processesSignal()[2].id,
      sentiment: 'alerta',
    },
  ]);

  readonly advisors = computed(() => this.advisorsSignal());
  readonly clients = computed(() => this.clientsSignal());
  readonly processes = computed(() => this.processesSignal());
  readonly documents = computed(() => this.documentsSignal());
  readonly chatHistory = computed(() => this.chatSignal());

  readonly dashboardSnapshot = computed(() => {
    const advisors = this.advisorsSignal();
    const clients = this.clientsSignal();
    const processes = this.processesSignal();

    const highRiskProcesses = processes.filter((process) => process.riskLevel === 'Alto');
    const hearingsThisMonth = processes.filter((process) => this.isDueThisMonth(process.nextHearingDate));

    return {
      totalClients: clients.length,
      totalProcesses: processes.length,
      activeAdvisors: advisors.filter((advisor) => advisor.status !== 'En audiencia').length,
      highRiskProcesses,
      hearingsThisMonth,
    };
  });

  addAdvisor(payload: AdvisorPayload): Advisor {
    const advisor: Advisor = { id: createId(), ...payload };
    this.advisorsSignal.update((collection) => [advisor, ...collection]);
    return advisor;
  }

  addClient(payload: ClientPayload): Client {
    const client: Client = { id: createId(), ...payload };
    this.clientsSignal.update((collection) => [client, ...collection]);
    return client;
  }

  addProcess(payload: ProcessPayload): LegalProcess {
    const process: LegalProcess = { id: createId(), ...payload };
    this.processesSignal.update((collection) => [process, ...collection]);
    return process;
  }

  addDocument(payload: DocumentPayload): LegalDocument {
    const document: LegalDocument = { id: createId(), ...payload };
    this.documentsSignal.update((collection) => [document, ...collection]);
    return document;
  }

  addChatMessage(message: ChatMessage): void {
    this.chatSignal.update((collection) => [...collection, message]);
  }

  findAdvisorById(id: string): Advisor | undefined {
    return this.advisorsSignal().find((advisor) => advisor.id === id);
  }

  findClientById(id: string): Client | undefined {
    return this.clientsSignal().find((client) => client.id === id);
  }

  findProcessById(id: string): LegalProcess | undefined {
    return this.processesSignal().find((process) => process.id === id);
  }

  private isDueThisMonth(date: string): boolean {
    const target = new Date(date);
    const now = new Date();
    return target.getMonth() === now.getMonth() && target.getFullYear() === now.getFullYear();
  }
}
