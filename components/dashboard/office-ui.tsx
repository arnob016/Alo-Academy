"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { DataSource, OfficeFailure } from "@/lib/office-actions";
import type { OfficeErrorKey } from "@/lib/office-validation";
import { card } from "../ui";

/* Shared pieces of the office pages. */

export const inputClass = "w-full rounded-md border border-ink/25 bg-white px-3 py-2 disabled:bg-ink/5 disabled:text-muted";
export const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-ink";
export const btnPrimary =
  "inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60";
export const btnSmall =
  "inline-flex items-center justify-center rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50";
export const btnOutline =
  "inline-flex items-center justify-center rounded-md border border-brand/30 px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-brand";
export const btnDanger =
  "inline-flex items-center justify-center rounded-md border border-red-700/40 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60";
export const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${
    active ? "border-brand bg-brand text-white" : "border-brand/20 bg-white text-ink hover:border-brand/50"
  }`;

export type Loaded<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error" } | { status: "unauthorized" };

/**
 * Loads office data with a Server Action, on mount and on `reload()`. Keeps
 * showing the last good data if a reload fails.
 */
export function useOfficeData<T extends { ok: true }>(load: () => Promise<T | OfficeFailure>) {
  const [state, setState] = useState<Loaded<T>>({ status: "loading" });
  const [reloadError, setReloadError] = useState(false);
  const latest = useRef(0);

  const reload = useCallback((): Promise<void> => {
    const call = ++latest.current;
    return load()
      .catch((): OfficeFailure => ({ ok: false, error: "generic" }))
      .then((res) => {
        // A slower, older call must not overwrite a newer one.
        if (call !== latest.current) return;
        if (res.ok) {
          setState({ status: "ready", data: res as T });
          setReloadError(false);
        } else if (res.error === "unauthorized") {
          setState({ status: "unauthorized" });
        } else {
          setState((prev) => (prev.status === "ready" ? prev : { status: "error" }));
          setReloadError(true);
        }
      });
  }, [load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload, reloadError };
}

/** The standard loading / signed-out / failed states; renders `children` once data is in. */
export function OfficeState<T>({ state, children }: { state: Loaded<T>; children: (data: T) => ReactNode }) {
  const t = useTranslations("office");
  const locale = useLocale();
  if (state.status === "loading") {
    return (
      <p aria-busy="true" className="text-muted">
        {t("loading")}
      </p>
    );
  }
  if (state.status === "unauthorized") {
    const here = typeof window === "undefined" ? `/${locale}/dashboard` : window.location.pathname;
    return (
      <div className={`${card} p-6`}>
        <p className="text-ink">{t("signInRequired")}</p>
        <Link
          href={`/${locale}/login?next=${encodeURIComponent(here)}`}
          className="mt-4 inline-flex rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark"
        >
          {t("signIn")}
        </Link>
      </div>
    );
  }
  if (state.status === "error") return <ErrorNote>{t("loadError")}</ErrorNote>;
  return <>{children(state.data)}</>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">
      {children}
    </p>
  );
}

/**
 * The form-level error to show for a failed save: null when every problem is
 * already shown next to a field the form has, so nothing is said twice.
 */
export function unshownError(res: OfficeFailure, shownFields: string[]): OfficeErrorKey | null {
  const fields = Object.keys(res.fields ?? {});
  if (fields.length && fields.every((f) => shownFields.includes(f))) return null;
  // "required" is only the umbrella for field errors; on its own it would be meaningless.
  return res.error === "required" ? "generic" : res.error;
}

/** The error message for a failed office action. */
export function useErrorText() {
  const t = useTranslations("office.errors");
  return (key: OfficeErrorKey | undefined) => (key ? t(key) : "");
}

/** Where the data comes from, plus a refresh button and any extra toolbar buttons. */
export function SourceBar({
  source,
  onRefresh,
  reloadError,
  children,
}: {
  source: DataSource;
  onRefresh: () => void;
  reloadError?: boolean;
  children?: ReactNode;
}) {
  const t = useTranslations("office");
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <span className="text-muted">{t(`source.${source}`)}</span>
      {reloadError && <span className="font-medium text-red-800">{t("reloadError")}</span>}
      <span className="flex flex-1 flex-wrap justify-end gap-2">
        {children}
        <button type="button" onClick={onRefresh} className={btnOutline}>
          {t("refresh")}
        </button>
      </span>
    </div>
  );
}

export function SampleBadge() {
  const t = useTranslations("office");
  return (
    <span className="rounded border border-dashed border-zinc-400 px-1.5 py-0.5 text-xs font-semibold text-zinc-600">
      {t("sample")}
    </span>
  );
}

/** A modal dialog (native <dialog>, so focus and Escape are handled by the browser). */
export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const t = useTranslations("office");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="office-modal-title"
      className={`m-auto w-[calc(100%-2rem)] rounded-xl bg-white p-0 shadow-xl backdrop:bg-ink/40 ${wide ? "max-w-3xl" : "max-w-lg"}`}
    >
      {open && (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="office-modal-title" className="text-lg font-semibold text-brand">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="-m-1 rounded p-1 text-muted hover:bg-ink/5 hover:text-ink"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/**
 * A text cell that Excel would run as a formula (names come from public forms,
 * so "=HYPERLINK(…)" is possible) gets a leading apostrophe and stays text.
 */
const csvCell = (cell: string | number) => {
  const text = typeof cell === "string" && /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : String(cell);
  return `"${text.replace(/"/g, '""')}"`;
};

/** Downloads rows as a CSV that Excel opens as UTF-8 (for Bangla names). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((line) => line.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Converts Bangla digits (০-৯) to English digits, for number inputs typed on a Bangla keyboard. */
export const englishDigits = (value: string) => value.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
