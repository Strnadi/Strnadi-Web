/* eslint-disable @typescript-eslint/no-inferrable-types */

import { type Emitter, type EventType, type Handler } from '@/vendor/mitt';
import { onMounted, onUnmounted } from 'vue';

export const useEventLast = <
  T extends Record<EventType, unknown>,
  K extends keyof T | '*'
>(
  emitter: Emitter<T>,
  event: K,
  handler: Handler<T[K]>,
  last: boolean = true
) => {
  onMounted(() => {
    emitter[last ? 'last' : 'on'](event, handler);
  });

  onUnmounted(() => {
    emitter.off(event, handler);
  });
};

export const useEvent = <
  T extends Record<EventType, unknown>,
  K extends keyof T
>(
  emitter: Emitter<T>,
  event: K,
  handler: Handler<T[K]>
): void => {
  useEventLast(emitter, event, handler, false);
};
