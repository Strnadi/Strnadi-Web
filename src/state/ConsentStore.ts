import { computed, reactive } from 'vue';
import {
  acceptDocument,
  getDocumentAcceptances,
  getDocuments,
  getOutstandingDocuments,
  revokeDocumentAcceptance,
  type Document,
  type DocumentAcceptance
} from '@/api/documents';
import { accountStore } from '@/state/AccountStore';
import { projectStore } from '@/state/ProjectStore';

/**
 * Required documents and what the user has accepted.
 *
 * This is not cosmetic: while a required, effective document is unaccepted the
 * token-exchange grant issues a project token with no roles and no permissions,
 * so every gated screen silently disappears until the user consents.
 */
export const consentStore = reactive({
  documents: [] as Document[],
  acceptances: [] as DocumentAcceptance[],
  loading: false,
  error: null as string | null,

  get outstanding(): Document[] {
    return getOutstandingDocuments(this.documents, this.acceptances);
  },

  async load() {
    if (!accountStore.identityToken) {
      this.documents = [];
      this.acceptances = [];
      return;
    }

    this.loading = true;
    this.error = null;
    try {
      // The API matches `ProjectId == projectId` exactly, so the platform-wide
      // documents and the project's own ones are two separate listings.
      const [platformDocuments, projectDocuments, acceptances] =
        await Promise.all([
          getDocuments({}),
          projectStore.current
            ? getDocuments({ projectId: projectStore.current.id })
            : Promise.resolve([]),
          getDocumentAcceptances(accountStore.identityToken)
        ]);

      this.documents = [...platformDocuments, ...projectDocuments];
      this.acceptances = acceptances;
    } catch (cause) {
      this.error =
        cause instanceof Error
          ? cause.message
          : 'Dokumenty se nepodařilo načíst.';
    } finally {
      this.loading = false;
    }
  },

  /**
   * Accepting can restore permissions, so the project token is exchanged again
   * once nothing is outstanding.
   */
  async accept(documentId: string) {
    if (!accountStore.identityToken) return;
    const acceptance = await acceptDocument(
      accountStore.identityToken,
      documentId
    );
    this.acceptances = [
      ...this.acceptances.filter((item) => item.documentId !== documentId),
      acceptance
    ];
    if (!this.outstanding.length) {
      await accountStore.reexchangeProjectToken();
    }
  },

  async revoke(acceptanceId: string) {
    if (!accountStore.identityToken) return;
    await revokeDocumentAcceptance(accountStore.identityToken, acceptanceId);
    await this.load();
    await accountStore.reexchangeProjectToken();
  },

  acceptanceFor(documentId: string): DocumentAcceptance | null {
    return (
      this.acceptances.find(
        (item) => item.documentId === documentId && !item.revokedAt
      ) ?? null
    );
  }
});

export const hasOutstandingConsent = computed(
  () => consentStore.outstanding.length > 0
);
