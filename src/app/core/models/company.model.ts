export type CompanyPersonType = 'LEGAL_ENTITY' | 'NATURAL_PERSON';

export interface CompanyProfile {
  id: string;
  legalName: string;
  taxId: string;
  address: string | null;
  email: string | null;
  legalRepresentative: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  registrationNumber: string | null;
  taxRegime: string | null;
  billingEmail: string | null;
  /** F45: datos fiscales para facturar con Alegra (opcionales hasta contratar un plan de pago). */
  taxIdCheckDigit?: string | null;
  personType?: CompanyPersonType | null;
  department?: string | null;
  fiscalResponsibilities?: string[] | null;
  billingContactName?: string | null;
  fiscalAddress?: string | null;
  website: string | null;
  logoUrl: string | null;
  onboardingCompletedAt: string | null;
  /** F11 (S10): si está activo, todo usuario del tenant sin 2FA queda bloqueado hasta activarlo. */
  require2fa: boolean;
  /** F40 §PRO-06: null si el tenant no lo ha configurado (se deriva de legalName al generar cada código). */
  processCodePrefix: string | null;
  /** F40 §PRO-06: correlativo actual — deshabilita la edición del prefijo una vez hay procesos creados. */
  processCodeCounter: number;
  /** F41 §CAL-04: días hábiles por defecto, ISO 8601 (1=lunes..7=domingo). */
  workingDays: number[];
  businessHoursStart: string | null;
  businessHoursEnd: string | null;
  nonWorkingDayExceptionUsers: CompanyScheduleExceptionUser[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyScheduleExceptionUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface UpdateCompanyRequest {
  legalName?: string;
  address?: string;
  email?: string;
  legalRepresentative?: string;
  phone?: string;
  city?: string;
  country?: string;
  registrationNumber?: string;
  taxRegime?: string;
  billingEmail?: string;
  taxIdCheckDigit?: string;
  personType?: CompanyPersonType;
  department?: string;
  fiscalResponsibilities?: string[];
  billingContactName?: string;
  fiscalAddress?: string;
  website?: string;
  require2fa?: boolean;
  /** F40 §PRO-06: 3 caracteres alfanuméricos en mayúscula (p. ej. "RGJ"). */
  processCodePrefix?: string;
  /** F41 §CAL-04: se envía SIEMPRE la lista completa (no un delta). */
  workingDays?: number[];
  businessHoursStart?: string | null;
  businessHoursEnd?: string | null;
  nonWorkingDayExceptionUserIds?: string[];
}

export interface CompanyLogoSignedUrlResponse {
  url: string;
  key: string;
  bucket: string;
  expiresIn: number;
}

/** F45: documentos societarios que el tenant adjunta a su facturación. */
export type CompanyDocumentType = 'RUT' | 'CHAMBER_OF_COMMERCE' | 'LEGAL_REP_ID';

export interface CompanyDocument {
  documentType: CompanyDocumentType;
  fileId: string;
  originalFilename: string;
  contentType: string;
  size: number;
  issuedAt: string | null;
  /** Solo cámara de comercio: fecha desde la cual se considera vencida. */
  expiresAt: string | null;
  isExpired: boolean;
  downloadUrl: string | null;
  updatedAt: string;
}

/** F45: respuesta de `GET /subscription/billing-readiness`. */
export interface BillingReadinessItem {
  code: string;
  label: string;
  /** Sección de Configuración donde se corrige el dato. */
  section: 'legal' | 'billing';
}

export interface BillingReadiness {
  ready: boolean;
  missing: BillingReadinessItem[];
}

/** Responsabilidades fiscales de la DIAN que acepta el backend (lista cerrada). */
export const FISCAL_RESPONSIBILITY_OPTIONS: { code: string; label: string }[] = [
  { code: 'O-13', label: 'Gran contribuyente' },
  { code: 'O-15', label: 'Autorretenedor' },
  { code: 'O-23', label: 'Agente de retención en el impuesto sobre las ventas' },
  { code: 'O-47', label: 'Régimen simple de tributación' },
  { code: 'R-99-PN', label: 'No aplica – Otros' },
];

/**
 * Régimen tributario ante la DIAN (factura electrónica): se guarda `code`.
 * Lista cerrada igual a la del backend (constants/tax-regimes.ts).
 */
export const TAX_REGIME_OPTIONS: { code: string; label: string; description: string }[] = [
  {
    code: 'VAT_RESPONSIBLE',
    label: 'Responsable de IVA',
    description: 'Cobra IVA en sus ventas y lo declara (código DIAN 48)',
  },
  {
    code: 'VAT_NOT_RESPONSIBLE',
    label: 'No responsable de IVA',
    description: 'No cobra ni declara IVA (código DIAN 49)',
  },
];
