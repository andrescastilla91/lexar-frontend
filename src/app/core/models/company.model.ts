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
}

export interface CompanyLogoSignedUrlResponse {
  url: string;
  key: string;
  bucket: string;
  expiresIn: number;
}
