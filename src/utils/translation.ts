import { get } from 'dotly';
import { translations, type TranslationIdentifier } from '@/constants/Translations';
import { applicationStore } from '@/state/ApplicationStore';

export function t(identifier: TranslationIdentifier): string {
  return get(translations[applicationStore.language], identifier, identifier);
}

