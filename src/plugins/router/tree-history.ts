import type { RouterHistory } from 'vue-router';

type NavigationCallback = Parameters<RouterHistory['listen']>[0];
type NavigationInformation = Parameters<NavigationCallback>[2];
type HistoryState = RouterHistory['state'];
type HistoryLocation = RouterHistory['location'];

interface TreeHistoryNode {
  location: HistoryLocation;
  state: HistoryState;
  parent: TreeHistoryNode | null;
  children: TreeHistoryNode[];
  activeChild: TreeHistoryNode | null;
}

const START_LOCATION = '';

function normalizeBase(base: string): string {
  if (!base) {
    return '/';
  }

  return base[0] === '/' ? base.replace(/\/+$/, '') || '/' : `/${base.replace(/\/+$/, '')}`;
}

function buildHref(base: string, location: HistoryLocation): string {
  const normalizedBase = normalizeBase(base);

  if (!location) {
    return normalizedBase;
  }

  const cleanLocation = location.startsWith('/') ? location : `/${location}`;
  return normalizedBase === '/' ? cleanLocation : `${normalizedBase}${cleanLocation}`;
}

function createNode(
  location: HistoryLocation,
  state: HistoryState,
  parent: TreeHistoryNode | null
): TreeHistoryNode {
  return {
    location,
    state,
    parent,
    children: [],
    activeChild: null
  };
}

export function createTreeHistory(base = ''): RouterHistory {
  const listeners: NavigationCallback[] = [];
  const normalizedBase = normalizeBase(base);
  let current = createNode(START_LOCATION, {}, null);

  function triggerListeners(
    to: HistoryLocation,
    from: HistoryLocation,
    direction: NavigationInformation['direction'],
    delta: number
  ): void {
    const info = {
      type: 'pop',
      direction,
      delta
    } as NavigationInformation;

    listeners.forEach((callback) => callback(to, from, info));
  }

  return {
    get base() {
      return normalizedBase;
    },
    get location() {
      return current.location;
    },
    get state() {
      return current.state;
    },
    push(to, data = {}) {
      const nextNode = createNode(to, data, current);
      current.children.push(nextNode);
      current.activeChild = nextNode;
      current = nextNode;
    },
    replace(to, data = {}) {
      current.location = to;
      current.state = data;
      current.children = [];
      current.activeChild = null;
    },
    go(delta, triggerListenersOnGo = true) {
      if (delta === 0) {
        return;
      }

      const from = current.location;
      const direction = delta < 0 ? 'back' : 'forward';
      const steps = Math.abs(delta);
      let moved = 0;

      while (moved < steps) {
        if (delta < 0) {
          if (!current.parent) {
            break;
          }

          current = current.parent;
        } else {
          if (!current.activeChild) {
            break;
          }

          current = current.activeChild;
        }

        moved += 1;
      }

      if (moved > 0 && triggerListenersOnGo) {
        const signedDelta = delta < 0 ? -moved : moved;
        triggerListeners(current.location, from, direction as NavigationInformation['direction'], signedDelta);
      }
    },
    listen(callback) {
      listeners.push(callback);
      return () => {
        const index = listeners.indexOf(callback);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      };
    },
    createHref(location) {
      return buildHref(normalizedBase, location);
    },
    destroy() {
      listeners.length = 0;
      current = createNode(START_LOCATION, {}, null);
    }
  };
}
