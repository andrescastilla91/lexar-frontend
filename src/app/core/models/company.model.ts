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
  website: string | null;
  logoUrl: string | null;
  onboardingCompletedAt: string | null;
  /** F11 (S10): si está activo, todo usuario del tenant sin 2FA queda bloqueado hasta activarlo. */
  require2fa: boolean;
  /** F40 §PRO-06: null si el tenant no lo ha configurado (se deriva de legalName al generar cada código). */
  processCodePrefix: string | null;
  /** F40 §PRO-06: correlativo actual — deshabilita la edición del prefijo una vez hay procesos creados. */
  processCodeCounter: number;
  createdAt: string;
  updatedAt: string;
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
  website?: string;
  require2fa?: boolean;
  /** F40 §PRO-06: 3 caracteres alfanuméricos en mayúscula (p. ej. "RGJ"). */
  processCodePrefix?: string;
}

export interface CompanyLogoSignedUrlResponse {
  url: string;
  key: string;
  bucket: string;
  expiresIn: number;
}
