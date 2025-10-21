<script lang="ts">
import { computed } from 'vue';
import {
  translations,
  type TranslationIdentifier
} from '@/constants/Translations';
import { applicationStore } from '@/state/ApplicationStore';

// @ts-expect-error Dotly has no type information
import { get } from 'dotly';

export const t = (identifier: TranslationIdentifier) => {
  return get(translations[applicationStore.language], identifier, identifier);
};

export const translatedDict = computed(
  () => translations[applicationStore.language]
);
</script>

<script setup lang="ts">
const props = defineProps<{
  identifier: TranslationIdentifier;
}>();

const translatedText = computed(() => t(props.identifier));
</script>

<template>
  {{ translatedText }}
</template>
