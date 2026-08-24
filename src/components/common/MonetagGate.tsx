"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const COOLDOWN_MS = 60_000;
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

type Registration = {
  target: EventTarget;
  type: string;
  listener: Listener;
  options?: boolean | AddEventListenerOptions;
  attached: boolean;
};

let installed = false;
let monetagReady = false;
let coolingDown = false;
let cooldownTimer: number | undefined;
let originalAdd: typeof EventTarget.prototype.addEventListener;
let originalRemove: typeof EventTarget.prototype.removeEventListener;
const registrations: Registration[] = [];

function calledByMonetag(): boolean {
  try {
    return MONETAG_SOURCE.test(new Error().stack ?? "");
  } catch {
    return false;
  }
}

function sameCapture(
  left?: boolean | AddEventListenerOptions,
  right?: boolean | EventListenerOptions,
) {
  const capture = (value?: boolean | EventListenerOptions) =>
    typeof value === "boolean" ? value : Boolean(value?.capture);
  return capture(left) === capture(right);
}

function detachMonetag() {
  for (const registration of registrations) {
    if (!registration.attached) continue;
    originalRemove.call(
      registration.target,
      registration.type,
      registration.listener,
      registration.options,
    );
    registration.attached = false;
  }
}

function attachMonetag() {
  for (const registration of registrations) {
    if (registration.attached) continue;
    originalAdd.call(
      registration.target,
      registration.type,
      registration.listener,
      registration.options,
    );
    registration.attached = true;
  }
}

function resetCooldown() {
  window.clearTimeout(cooldownTimer);
  coolingDown = false;
  attachMonetag();
}

function startCooldownAfterCurrentClick(event: Event) {
  if (!monetagReady || coolingDown || !event.isTrusted) return;

  // The Monetag listeners still receive this event unchanged. Detachment only
  // happens in the next task, after the popunder code has finished the gesture.
  window.setTimeout(() => {
    coolingDown = true;
    detachMonetag();
    cooldownTimer = window.setTimeout(resetCooldown, COOLDOWN_MS);
  }, 0);
}

function installGate() {
  if (installed) return;
  installed = true;
  originalAdd = EventTarget.prototype.addEventListener;
  originalRemove = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: Listener | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (!listener || !ACTIVATION_EVENTS.has(type) || !calledByMonetag()) {
      return originalAdd.call(this, type, listener, options);
    }

    const existing = registrations.find(
      (item) =>
        item.target === this &&
        item.type === type &&
        item.listener === listener &&
        sameCapture(item.options, options),
    );
    if (!existing) {
      registrations.push({
        target: this,
        type,
        listener,
        options,
        attached: !coolingDown,
      });
    }

    if (!coolingDown) return originalAdd.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function (
    type: string,
    listener: Listener | null,
    options?: boolean | EventListenerOptions,
  ) {
    if (listener) {
      const index = registrations.findIndex(
        (item) =>
          item.target === this &&
          item.type === type &&
          item.listener === listener &&
          sameCapture(item.options, options),
      );
      if (index >= 0) registrations.splice(index, 1);
    }
    return originalRemove.call(this, type, listener, options);
  };

  originalAdd.call(document, "click", startCooldownAfterCurrentClick, true);
  originalAdd.call(window, "monetag:ready", () => {
    monetagReady = true;
  });
}

export function MonetagGate() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    installGate();
  }, []);

  useEffect(() => {
    resetCooldown();
  }, [pathname]);

  return null;
}
