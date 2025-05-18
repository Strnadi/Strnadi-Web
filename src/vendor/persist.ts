import { watch } from "vue";

// @ts-expect-error Dotly has no type information
import { get, set } from "dotly";

const DEFAULT_KEY = "reactive_persisted";

export interface PersistOptions<T> {
  key: string;
  paths: string[];
  storage: Storage;
  syncCallback: (store: T) => void | Promise<void>;
};

/* Persists a Vue reactive object */
export const persist = <T>(object: T, options?: Partial<PersistOptions<T>>) => {
  if (!object) {
    throw new Error("Please provide a reactive object");
  }

  const _storage = options?.storage ?? window.localStorage;
  const _key = options?.key ?? DEFAULT_KEY;
  const _paths = options?.paths;
  const _store = assertStore(_storage, _key);

  syncReactiveWithLocal(object, _store, _paths);
  options?.syncCallback?.(object);

  watch(
    object,
    newObject => {
      syncLocalWithReactive(newObject, _storage, _key, _paths);
    },
    { deep: true }
  );

  return object;
};

/**
 * Asserts store
 */
const assertStore = (storage: Storage, key: string): object | null => {
  const _store = storage.getItem(key);

  if (!_store) {
    storage.setItem(key, JSON.stringify({}));
  }

  return getStore(storage, key)!;
};

/**
 * Gets store
 */
const getStore = (storage: Storage, key: string): object | null => {
  let _store = storage.getItem(key);

  try {
    if (typeof _store === "string") {
      _store = JSON.parse(_store);

      if (typeof _store === "object") {
        return _store;
      }
    }
  } catch (error) {
    // Ignore
  }

  return null;
};

/**
 * Syncs reactive object with local store
 */
const syncReactiveWithLocal = (object: object, store: object, paths?: string[]): void => {
  if (paths) {
    paths.forEach(path => {
      const _value = get(store, path);

      if (_value !== undefined) {
        set(object, path, _value);
      }
    });
  } else {
    object = Object.assign(object, store);
  }
};

/**
 * Syncs local store with reactive object
 */
const syncLocalWithReactive = (object: object, storage: Storage, key: string, paths?: string[]): void => {
  let _store = {};

  if (paths) {
    paths.forEach(path => {
      set(_store, path, get(object, path));
    });
  } else {
    _store = Object.assign({}, object);
  }

  storage.setItem(key, JSON.stringify(_store));
};

export default persist;
