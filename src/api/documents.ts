import axios, { type AxiosRequestConfig } from 'axios';
import { authorizationConfig } from '@/api/auth';

/**
 * Administration `DocumentType`. The API serialises enums numerically, so the
 * ordinals below have to match the C# declaration order.
 */
export enum DocumentType {
  TermsOfService = 0,
  PrivacyPolicy = 1,
  DataProcessingAgreement = 2,
  MarketingConsent = 3,
  CookiePolicy = 4
}

/** Administration `DocumentResponse`. */
export interface Document {
  id: string;
  type: DocumentType;
  title: string;
  version: number;
  content: string;
  publishedAt: string;
  effectiveAt: string;
  isActive: boolean;
  isRequired: boolean;
  projectId: string | null;
}

export interface CreateDocumentRequest {
  type: DocumentType;
  title: string;
  content: string;
  projectId: string | null;
  effectiveAt?: string | null;
  isRequired?: boolean;
}

export interface UpdateDocumentRequest {
  content: string;
  title?: string | null;
  effectiveAt?: string | null;
  isRequired?: boolean | null;
}

/** Administration `DocumentAcceptanceResponse`. */
export interface DocumentAcceptance {
  id: string;
  userId: string;
  documentId: string;
  acceptedAt: string;
  revokedAt: string | null;
}

const administrationUrl = (path: string): string =>
  `${authorizationConfig.baseUrl}${path}`;

const identityRequest = (identityToken: string): AxiosRequestConfig => ({
  headers: { Authorization: `Bearer ${identityToken}` }
});

/**
 * Lists documents. Project documents live under a project id; passing none
 * lists the platform-wide ones, matching the API's `d.ProjectId == projectId`
 * filter.
 */
export const getDocuments = async (
  options: {
    type?: DocumentType;
    projectId?: string | null;
    activeOnly?: boolean;
  } = {}
): Promise<Document[]> => {
  const params: Record<string, string | boolean | number> = {
    activeOnly: options.activeOnly ?? true
  };
  if (options.type !== undefined) params['type'] = options.type;
  if (options.projectId) params['projectId'] = options.projectId;

  const response = await axios.get<Document[]>(administrationUrl('/documents'), {
    params
  });
  return response.data;
};

export const getDocument = async (id: string): Promise<Document> => {
  const response = await axios.get<Document>(
    administrationUrl(`/documents/${encodeURIComponent(id)}`)
  );
  return response.data;
};

/** The rendered, standalone HTML view - suitable for a consent link target. */
export const documentViewUrl = (id: string): string =>
  administrationUrl(`/documents/${encodeURIComponent(id)}/view`);

export const createDocument = async (
  identityToken: string,
  request: CreateDocumentRequest
): Promise<Document> => {
  const response = await axios.post<Document>(
    administrationUrl('/documents'),
    request,
    identityRequest(identityToken)
  );
  return response.data;
};

/** Publishes the next version: deactivates the current one and supersedes it. */
export const updateDocument = async (
  identityToken: string,
  id: string,
  request: UpdateDocumentRequest
): Promise<Document> => {
  const response = await axios.put<Document>(
    administrationUrl(`/documents/${encodeURIComponent(id)}`),
    request,
    identityRequest(identityToken)
  );
  return response.data;
};

export const getDocumentAcceptances = async (
  identityToken: string
): Promise<DocumentAcceptance[]> => {
  const response = await axios.get<DocumentAcceptance[]>(
    administrationUrl('/document-acceptances'),
    identityRequest(identityToken)
  );
  return response.data;
};

export const acceptDocument = async (
  identityToken: string,
  documentId: string
): Promise<DocumentAcceptance> => {
  const response = await axios.post<DocumentAcceptance>(
    administrationUrl('/document-acceptances'),
    { documentId },
    identityRequest(identityToken)
  );
  return response.data;
};

/** Soft-revokes an acceptance (sets RevokedAt). */
export const revokeDocumentAcceptance = async (
  identityToken: string,
  acceptanceId: string
): Promise<void> => {
  await axios.patch(
    administrationUrl(
      `/document-acceptances/${encodeURIComponent(acceptanceId)}/revoke`
    ),
    undefined,
    identityRequest(identityToken)
  );
};

/**
 * Required, currently-effective documents the user has not accepted (or has
 * since revoked). A non-empty result is what makes the project token come back
 * without roles or permissions, so the UI has to resolve it before anything
 * else works.
 */
export const getOutstandingDocuments = (
  documents: Document[],
  acceptances: DocumentAcceptance[]
): Document[] => {
  const accepted = new Set(
    acceptances
      .filter((acceptance) => !acceptance.revokedAt)
      .map((acceptance) => acceptance.documentId)
  );
  const now = Date.now();
  return documents.filter(
    (document) =>
      document.isRequired &&
      document.isActive &&
      Date.parse(document.effectiveAt) <= now &&
      !accepted.has(document.id)
  );
};
