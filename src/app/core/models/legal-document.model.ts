export interface PendingLegalDocument {
  id: string;
  type: string;
  version: string;
  originalFilename: string;
  contentType: string;
  publishedAt: string;
  downloadUrl: string;
}

export interface PendingAcceptanceResponse {
  pending: PendingLegalDocument | null;
}

export interface AcceptLegalDocumentResponse {
  message: string;
  acceptedAt: string;
}
