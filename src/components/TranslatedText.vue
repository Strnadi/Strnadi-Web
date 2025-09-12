<script setup lang="ts">
import { translations, type TranslationIdentifier } from '@/constants/Translations';
import { applicationStore } from '@/state/ApplicationStore';

// @ts-expect-error Dotly has no type information
import { get } from "dotly";


defineProps<{
  identifier: TranslationIdentifier
}>();

</script>

<template>
  {{ get(translations[applicationStore.language], identifier, identifier) }}
</template>
