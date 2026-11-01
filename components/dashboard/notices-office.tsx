"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { noticeTags, type NoticeTag } from "@/content/notices";
import { inLocale } from "@/content/types";
import type { OfficeErrorKey } from "@/lib/office-validation";
import { deleteOfficeNotice, listOfficeNotices, saveOfficeNotice, type OfficeNotice } from "@/lib/publish-actions";
import { dhakaDateKey } from "@/lib/schedule";
import { card } from "../ui";
import {
  btnDanger,
  btnOutline,
  btnPrimary,
  ErrorNote,
  inputClass,
  labelClass,
  Modal,
  OfficeState,
  SampleBadge,
  SourceBar,
  unshownError,
  useErrorText,
  useOfficeData,
} from "./office-ui";

const tagStyle: Record<NoticeTag, string> = {
  exam: "bg-brand text-white",
  batch: "bg-accent text-ink",
  result: "bg-emerald-700 text-white",
  holiday: "bg-ink/10 text-ink",
};

export function NoticesOffice() {
  const t = useTranslations("office.notices");
  const tOffice = useTranslations("office");
  const locale = useLocale();
  const format = useFormatter();
  const errorText = useErrorText();
  const { state, reload, reloadError } = useOfficeData(listOfficeNotices);
  const [editing, setEditing] = useState<OfficeNotice | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<OfficeErrorKey | null>(null);

  async function remove(n: OfficeNotice) {
    if (!window.confirm(t("deleteConfirm", { title: inLocale(n.title, locale) }))) return;
    setDeleting(n.id);
    setError(null);
    const res = await deleteOfficeNotice(n.id).catch(() => ({ ok: false as const, error: "generic" as const }));
    setDeleting(null);
    if (!res.ok) return setError(res.error);
    await reload();
  }

  return (
    <OfficeState state={state}>
      {(data) => (
        <div className="space-y-6">
          <SourceBar source={data.source} onRefresh={() => void reload()} reloadError={reloadError}>
            <Link href={`/${locale}#notices`} className={btnOutline}>
              {t("viewPublic")}
            </Link>
            <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
              {t("add")}
            </button>
          </SourceBar>

          <div aria-live="polite">{error && <ErrorNote>{errorText(error)}</ErrorNote>}</div>

          {data.notices.length === 0 ? (
            <p className={`${card} p-6 text-muted`}>{t("empty")}</p>
          ) : (
            <ul className="space-y-4">
              {data.notices.map((n) => (
                <li key={n.id} className={`${card} flex flex-wrap items-start justify-between gap-4 p-5 ${n.pinned ? "ring-2 ring-accent" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className={`rounded px-1.5 py-0.5 ${tagStyle[n.tag]}`}>{t(`tags.${n.tag}`)}</span>
                      <span className="text-muted">
                        {n.date ? format.dateTime(new Date(`${n.date}T00:00:00+06:00`), { dateStyle: "medium" }) : "—"}
                      </span>
                      {n.pinned && <span className="text-muted">{t("pinned")}</span>}
                      {n.origin === "sample" && <SampleBadge />}
                      {n.origin === "memory" && data.source === "sheet" && (
                        <span className="rounded bg-ink/10 px-1.5 py-0.5 text-ink">{t("demoOnly")}</span>
                      )}
                    </p>
                    <h2 className="mt-2 font-semibold text-ink">{inLocale(n.title, locale)}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{inLocale(n.body, locale)}</p>
                    {(!n.title.bn || !n.title.en) && <p className="mt-2 text-xs text-muted">{t("oneLanguage")}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="flex gap-2">
                      <button type="button" onClick={() => setEditing(n)} disabled={n.lock !== null} className={btnOutline}>
                        {t("edit")}
                      </button>
                      <button type="button" onClick={() => void remove(n)} disabled={n.lock !== null || deleting === n.id} className={btnDanger}>
                        {t("delete")}
                      </button>
                    </span>
                    {n.lock && <span className="max-w-56 text-right text-xs text-muted">{errorText(n.lock)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Modal open={editing !== null} title={editing === "new" ? t("addTitle") : t("editTitle")} onClose={() => setEditing(null)} wide>
            {editing !== null && (
              <NoticeForm
                key={editing === "new" ? "new" : editing.id}
                notice={editing === "new" ? null : editing}
                onSaved={() => {
                  setEditing(null);
                  void reload();
                }}
              />
            )}
          </Modal>
          <p className="text-sm text-muted">{tOffice("publicCache")}</p>
        </div>
      )}
    </OfficeState>
  );
}

function NoticeForm({ notice, onSaved }: { notice: OfficeNotice | null; onSaved: () => void }) {
  const t = useTranslations("office.notices");
  const tOffice = useTranslations("office");
  const errorText = useErrorText();
  const [values, setValues] = useState({
    date: notice?.date || dhakaDateKey(new Date()),
    tag: notice?.tag ?? ("batch" as NoticeTag),
    pinned: Boolean(notice?.pinned),
    titleBn: notice?.title.bn ?? "",
    titleEn: notice?.title.en ?? "",
    bodyBn: notice?.body.bn ?? "",
    bodyEn: notice?.body.en ?? "",
  });
  const [errors, setErrors] = useState<Record<string, OfficeErrorKey>>({});
  const [formError, setFormError] = useState<OfficeErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (field: "date" | "titleBn" | "titleEn" | "bodyBn" | "bodyEn") => (value: string) =>
    setValues((v) => ({ ...v, [field]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    const res = await saveOfficeNotice({ ...values, id: notice?.id ?? "" }).catch(() => ({
      ok: false as const,
      error: "generic" as const,
      fields: undefined,
    }));
    setBusy(false);
    if (res.ok) return onSaved();
    setErrors(res.fields ?? {});
    setFormError(unshownError(res, ["date", "tag", "titleBn", "titleEn", "bodyBn", "bodyEn"]));
  }

  const fieldError = (name: string) =>
    errors[name] ? <span className="text-sm font-normal text-red-800">{errorText(errors[name])}</span> : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelClass}>
          {t("date")}
          <input type="date" value={values.date} onChange={(e) => set("date")(e.target.value)} required className={inputClass} />
          {fieldError("date")}
        </label>
        <label className={labelClass}>
          {t("tag")}
          <select value={values.tag} onChange={(e) => setValues((v) => ({ ...v, tag: e.target.value as NoticeTag }))} className={inputClass}>
            {noticeTags.map((tag) => (
              <option key={tag} value={tag}>
                {t(`tags.${tag}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={values.pinned}
            onChange={(e) => setValues((v) => ({ ...v, pinned: e.target.checked }))}
            className="size-4 accent-brand"
          />
          {t("pinToTop")}
        </label>
      </div>

      <p className="text-sm text-muted">{t("languagesHint")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="space-y-3">
          <legend className="font-semibold text-brand">বাংলা</legend>
          <label className={labelClass}>
            {t("headline")}
            <input lang="bn" value={values.titleBn} onChange={(e) => set("titleBn")(e.target.value)} maxLength={120} className={inputClass} />
            {fieldError("titleBn")}
          </label>
          <label className={labelClass}>
            {t("body")}
            <textarea lang="bn" value={values.bodyBn} onChange={(e) => set("bodyBn")(e.target.value)} rows={4} maxLength={1000} className={inputClass} />
            {fieldError("bodyBn")}
          </label>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="font-semibold text-brand">English</legend>
          <label className={labelClass}>
            {t("headline")}
            <input lang="en" value={values.titleEn} onChange={(e) => set("titleEn")(e.target.value)} maxLength={120} className={inputClass} />
            {fieldError("titleEn")}
          </label>
          <label className={labelClass}>
            {t("body")}
            <textarea lang="en" value={values.bodyEn} onChange={(e) => set("bodyEn")(e.target.value)} rows={4} maxLength={1000} className={inputClass} />
            {fieldError("bodyEn")}
          </label>
        </fieldset>
      </div>

      <div aria-live="polite">{formError && <ErrorNote>{errorText(formError)}</ErrorNote>}</div>

      <div className="flex justify-end">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? tOffice("saving") : t("publish")}
        </button>
      </div>
    </form>
  );
}
