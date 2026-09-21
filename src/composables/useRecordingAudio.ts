import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { getRecordingPartSound } from '@/api/recordings';
import { accountStore } from '@/state/AccountStore';

interface PartLike {
  id: number;
}

/**
 * Object URLs for a recording's parts.
 *
 * `GET /recordings/part/{id}/sound` requires a bearer token, so the audio has
 * to be fetched rather than handed to an <audio> element as a plain URL. The
 * blobs are revoked whenever the part list changes and when the scope ends.
 */
export const useRecordingPartAudioUrls = (
  parts: MaybeRefOrGetter<PartLike[] | null | undefined>
) => {
  const urls = ref<string[]>([]);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  let generation = 0;

  const revoke = () => {
    urls.value.forEach((url) => URL.revokeObjectURL(url));
    urls.value = [];
  };

  // Keyed on the part ids so an unrelated re-render does not re-download the
  // audio, and on the token because the request is bearer-authorized.
  watch(
    () =>
      [
        (toValue(parts) ?? []).map((part) => part.id).join(','),
        accountStore.token
      ] as const,
    async ([key, token]) => {
      const current = ++generation;
      revoke();
      error.value = null;
      if (!key || !token) return;

      const ids = key.split(',').map(Number);
      isLoading.value = true;
      try {
        const loaded: string[] = [];
        for (const id of ids) {
          const { data, contentType } = await getRecordingPartSound(token, id);
          loaded.push(
            URL.createObjectURL(new Blob([data], { type: contentType }))
          );
        }

        if (current !== generation) {
          loaded.forEach((url) => URL.revokeObjectURL(url));
          return;
        }
        urls.value = loaded;
      } catch (cause) {
        if (current !== generation) return;
        error.value =
          cause instanceof Error
            ? cause
            : new Error('Zvuk nahrávky se nepodařilo načíst.');
      } finally {
        if (current === generation) isLoading.value = false;
      }
    },
    { immediate: true }
  );

  onScopeDispose(revoke);

  return { urls, isLoading, error };
};
