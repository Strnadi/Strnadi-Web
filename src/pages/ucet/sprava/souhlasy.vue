<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { DocumentType, documentViewUrl, type Document } from '@/api/documents';
import { consentStore } from '@/state/ConsentStore';
import TranslatedText from '@/components/TranslatedText.vue';
import type { TranslationIdentifier } from '@/constants/Translations';

const typeLabels: Record<DocumentType, TranslationIdentifier> = {
  [DocumentType.TermsOfService]: 'account.consents.types.terms',
  [DocumentType.PrivacyPolicy]: 'account.consents.types.privacy',
  [DocumentType.DataProcessingAgreement]: 'account.consents.types.processing',
  [DocumentType.MarketingConsent]: 'account.consents.types.marketing',
  [DocumentType.CookiePolicy]: 'account.consents.types.cookies'
};

const outstanding = computed(() => consentStore.outstanding);
const outstandingIds = computed(
  () => new Set(outstanding.value.map((document) => document.id))
);

const settled = computed(() =>
  consentStore.documents.filter(
    (document) => !outstandingIds.value.has(document.id)
  )
);

const formatDate = (value: string) =>
  value ? new Date(value).toLocaleDateString('cs') : '—';

const typeLabel = (document: Document) =>
  typeLabels[document.type] ?? 'account.consents.title';

onMounted(() => consentStore.load());
</script>

<template>
  <section class="flex w-full flex-col gap-4">
    <h1><TranslatedText identifier="account.consents.title" /></h1>
    <p class="text-sm text-gray-600">
      <TranslatedText identifier="account.consents.description" />
    </p>

    <p v-if="consentStore.loading" role="status">
      <TranslatedText identifier="states.loading" />
    </p>
    <p v-else-if="consentStore.error" role="alert" class="text-red-700">
      <TranslatedText identifier="account.consents.load_error" />
    </p>

    <template v-else>
      <section v-if="outstanding.length" class="flex flex-col gap-3">
        <h2 class="text-amber-800">
          <TranslatedText identifier="account.consents.outstanding_title" />
        </h2>
        <article
          v-for="document in outstanding"
          :key="document.id"
          class="rounded-xl border border-amber-300 bg-amber-50 p-4"
        >
          <p class="font-semibold">
            {{ document.title }}
            <span class="ml-2 text-xs text-amber-800">
              <TranslatedText :identifier="typeLabel(document)" />
            </span>
          </p>
          <p class="text-xs text-gray-600">
            <TranslatedText identifier="account.consents.version_label" />
            {{ document.version }} ·
            <TranslatedText identifier="account.consents.effective_from" />
            {{ formatDate(document.effectiveAt) }}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <a
              :href="documentViewUrl(document.id)"
              target="_blank"
              rel="noopener"
              class="button-secondary px-3 py-1.5 text-sm"
            >
              <TranslatedText identifier="account.consents.read" />
            </a>
            <button
              type="button"
              class="button-primary px-3 py-1.5 text-sm"
              @click="consentStore.accept(document.id)"
            >
              <TranslatedText identifier="account.consents.accept" />
            </button>
          </div>
        </article>
      </section>

      <p v-if="!consentStore.documents.length" class="text-sm text-gray-600">
        <TranslatedText identifier="account.consents.empty" />
      </p>

      <ul class="flex flex-col gap-2">
        <li
          v-for="document in settled"
          :key="document.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div class="min-w-48">
            <p class="font-medium">
              {{ document.title }}
              <span class="ml-2 text-xs text-gray-500">
                <TranslatedText :identifier="typeLabel(document)" />
              </span>
              <span
                class="ml-2 rounded px-2 py-0.5 text-xs"
                :class="
                  document.isRequired
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-600'
                "
              >
                <TranslatedText
                  :identifier="
                    document.isRequired
                      ? 'account.consents.required_badge'
                      : 'account.consents.optional_badge'
                  "
                />
              </span>
            </p>
            <p class="text-xs text-gray-500">
              <TranslatedText identifier="account.consents.version_label" />
              {{ document.version }}
              <template v-if="consentStore.acceptanceFor(document.id)">
                ·
                <TranslatedText identifier="account.consents.accepted_on" />
                {{
                  formatDate(consentStore.acceptanceFor(document.id)!.acceptedAt)
                }}
              </template>
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <a
              :href="documentViewUrl(document.id)"
              target="_blank"
              rel="noopener"
              class="button-secondary px-3 py-1.5 text-sm"
            >
              <TranslatedText identifier="account.consents.read" />
            </a>
            <button
              v-if="consentStore.acceptanceFor(document.id)"
              type="button"
              class="button-danger px-3 py-1.5 text-sm"
              @click="
                consentStore.revoke(consentStore.acceptanceFor(document.id)!.id)
              "
            >
              <TranslatedText identifier="account.consents.revoke" />
            </button>
            <button
              v-else
              type="button"
              class="button-primary px-3 py-1.5 text-sm"
              @click="consentStore.accept(document.id)"
            >
              <TranslatedText identifier="account.consents.accept" />
            </button>
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>
