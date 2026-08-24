"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const COOLDOWN_MS = 60_000;
const STORAGE_KEY = "monetag_last_ad";
const MONETAG_SOURCE = /(?:al5sm\.com|tag\.min\.js)/i;
const ACTIVATION_EVENTS = new Set([
  "click",
  "mousedown",
  "mouseup",
  "pointerdown",
  "pointerup",
  "touchstart",
  "touchend",
]);

type Listener = EventListenerOrEventListenerObject;

let installed = false;
let gestureAllowed = false;
let gestureTimer: number | undefined;
const wrappedListeners = new WeakMap<Listener, EventListener>();

function lastAdAt(): number {
  try {
    return Number(sessionStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function beginAllowedGesture() {
  gestureAllowed = true;
  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Storage can be unavailable in privacy modes; the in-memory gate still works.
  }

  window.clearTimeout(gestureTimer);
  // One activation can emit pointer/mouse/click events in sequence. Keep that
  // sequence intact so Monetag can finish opening a single ad.
  gestureTimer = window.setTimeout(() => {
    gestureAllowed = false;
  }, 1_000);
}

function finishAllowedGesture(event: Event) {
  if (event.type !== "click" && event.type !== "touchend") return;
  window.clearTimeout(gestureTimer);
  // All listeners for the current event run synchronously. Closing on the next
  // task lets those listeners finish but rejects the very next user gesture.
  gestureTimer = window.setTimeout(() => {
    gestureAllowed = false;
  }, 0);
}

function monetagMayHandle(event: Event): boolean {
  if (!ACTIVATION_EVENTS.has(event.type)) return true;
  if (gestureAllowed) return true;

  const lastAd = lastAdAt();
  if (!lastAd || Date.now() - lastAd >= COOLDOWN_MS) {
    beginAllowedGesture();
    return true;
  }

  return false;
}

function calledByMonetag(): boolean {
  try {
    return MONETAG_SOURCE.test(new Error().stack ?? "");
  } catch {
    return false;
  }
}

function installListenerGate() {
  if (installed) return;
  installed = true;

  const originalAdd = EventTarget.prototype.addEventListener;
  const originalRemove = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: Listener | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (!listener || !ACTIVATION_EVENTS.has(type) || !calledByMonetag()) {
      return originalAdd.call(this, type, listener, options);
    }

    let wrapped = wrappedListeners.get(listener);
    if (!wrapped) {
      wrapped = function (this: EventTarget, event: Event) {
        if (!monetagMayHandle(event)) return;
        try {
          if (typeof listener === "function") return listener.call(this, event);
          return listener.handleEvent(event);
        } finally {
          finishAllowedGesture(event);
        }
      };
      wrappedListeners.set(listener, wrapped);
    }

    return originalAdd.call(this, type, wrapped, options);
  };

  EventTarget.prototype.removeEventListener = function (
    type: string,
    listener: Listener | null,
    options?: boolean | EventListenerOptions,
  ) {
    const wrapped = listener ? wrappedListeners.get(listener) : undefined;
    return originalRemove.call(this, type, wrapped ?? listener, options);
  };
}

function resetForNavigation() {
  gestureAllowed = false;
  window.clearTimeout(gestureTimer);
  try {
    sessionStorage.setItem(STORAGE_KEY, "0");
  } catch {
    // The in-memory state above is sufficient when storage is unavailable.
  }
}

export function MonetagGate() {
  const pathname = usePathname();

  useEffect(() => {
    resetForNavigation();
  }, [pathname]);

  // Must run before ThirdPartyScripts' passive effect injects the remote tag.
  useLayoutEffect(() => {
    installListenerGate();
  }, []);

  return null;
}
