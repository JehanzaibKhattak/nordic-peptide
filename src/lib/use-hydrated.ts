"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** false during SSR and the hydration render, true afterwards. No effect/setState needed. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Subscribe to a browser-side value that changes on a window event. */
export function useWindowEventValue<T>(event: string, read: () => T, serverValue: T): T {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(event, cb);
      return () => window.removeEventListener(event, cb);
    },
    read,
    () => serverValue,
  );
}
