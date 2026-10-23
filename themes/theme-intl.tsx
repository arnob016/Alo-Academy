"use client";

import { use, type ReactNode } from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import type { Locale } from "@/i18n/routing";

// Imported by each theme, so the translation runtime and messages load with
// the theme's chunk instead of on every classic page.

const cache = new Map<Locale, Promise<AbstractIntlMessages>>();

function loadMessages(locale: Locale) {
  let promise = cache.get(locale);
  if (!promise) {
    promise = (locale === "en" ? import("@/messages/en.json") : import("@/messages/bn.json")).then(
      (mod) => mod.default as AbstractIntlMessages,
    );
    markSettled(promise);
    cache.set(locale, promise);
  }
  return promise;
}

/** Lets themes fetch messages before a switch, so the first render doesn't suspend. */
export const prepareMessages = loadMessages;

// React's use() suspends on promises it hasn't seen, even resolved ones, unless
// they carry status/value. Marking them keeps an instant theme switch instant.
function markSettled<T>(promise: Promise<T>) {
  const tracked = promise as Promise<T> & { status?: string; value?: T };
  promise.then((value) => {
    tracked.status = "fulfilled";
    tracked.value = value;
  });
}

export function ThemeIntl({ locale, children }: { locale: Locale; children: ReactNode }) {
  const messages = use(loadMessages(locale));
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Dhaka">
      {children}
    </NextIntlClientProvider>
  );
}
