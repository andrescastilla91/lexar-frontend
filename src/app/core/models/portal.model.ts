// F16: modelos del portal de cliente — actor separado del RBAC interno
// (ver PortalAuthService/portal-auth.guard). Nunca reutilizar AuthUser aquí.

export interface PortalUser {
  id: string;
  email: string;
  clientId: string;
}

export interface PortalLoginRequest {
  email: string;
  password: string;
}

export interface PortalLoginResponse {
  message: string;
  user: PortalUser;
}

export interface PortalAcceptInvitationRequest {
  token: string;
  password: string;
}

export interface PortalForgotPasswordRequest {
  email: string;
}

export interface PortalResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface PortalMessageResponse {
  message: string;
}

export interface PortalProcessAdvisor {
  name: string;
}

export interface PortalProcessListItem {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  stage: string | null;
  court: string | null;
  caseNumber: string | null;
  nextHearingDate: string | null;
  advisors: PortalProcessAdvisor[];
  createdAt: string;
}

export interface PortalTimelineItem {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface PortalDocumentItem {
  id: string;
  originalFilename: string;
  contentType: string;
  formattedSize: string;
  createdAt: string;
}

export interface PortalDownloadUrlResponse {
  url: string;
  filename: string;
  contentType: string;
  expiresIn: number;
}

// F16 — lado interno (RBAC): gestión de accesos de portal desde el detalle
// del cliente (A3.2). No confundir con PortalUser (identidad del cliente
// autenticado dentro del propio portal).

export interface ClientPortalInvitationSummary {
  id: string;
  email: string;
  isActive: boolean;
  status: 'activo' | 'pendiente';
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ClientPortalInvitationsListResponse {
  portalUsers: ClientPortalInvitationSummary[];
}

export interface InviteClientPortalRequest {
  email: string;
}

export interface InviteClientPortalResponse {
  message: string;
  portalUser: {
    id: string;
    email: string;
    clientId: string;
  };
}
