"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { listOfficeMessages, setOfficeMessageHandled } from "@/lib/admin-actions";
import type { ContactMessage } from "@/lib/contact-messages";
import type { OfficeErrorKey } from "@/lib/office-validation";
import { card } from "../ui";
import { btnOutline, chip, ErrorNote, OfficeState, SampleBadge, SourceBar, useErrorText, useOfficeData } from "./office-ui";

const filters = ["open", "handled", "all"] as const;

export function MessagesOffice() {
  const t = useTranslations("office.messages");
  const tOffice = useTranslations("office");
  const format = useFormatter();
  const errorText = useErrorText();
  const { state, reload, reloadError } = useOfficeData(listOfficeMessages);
  const [filter, setFilter] = useState<(typeof filters)[number]>("open");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<OfficeErrorKey | null>(null);

  async function toggle(m: ContactMessage) {
    setBusy(m.id);
    setError(null);
    const res = await setOfficeMessageHandled(m.id, !m.handled).catch(() => ({ ok: false as const, error: "generic" as const }));
    setBusy(null);
    if (!res.ok) return setError(res.error);
    await reload();
  }

  return (
    <OfficeState state={state}>
      {(data) => {
        const count = (f: (typeof filters)[number]) =>
          data.messages.filter((m) => f === "all" || (f === "handled" ? m.handled : !m.handled)).length;
        const visible = data.messages.filter((m) => filter === "all" || (filter === "handled" ? m.handled : !m.handled));
        // Masked numbers (demo mode) contain "*" and can't be dialled.
        const dialable = (phone: string) => /^\+?\d+$/.test(phone);

        return (
          <div className="space-y-6">
            <SourceBar source={data.source} onRefresh={() => void reload()} reloadError={reloadError} />
            <div aria-live="polite">{error && <ErrorNote>{errorText(error)}</ErrorNote>}</div>

            <div role="group" aria-label={tOffice("filter")} className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={chip(filter === f)}>
                  {t(`filters.${f}`)} <span className={filter === f ? "text-white/75" : "text-muted"}>{format.number(count(f))}</span>
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className={`${card} p-6 text-muted`}>{t("empty")}</p>
            ) : (
              <ul className="space-y-4">
                {visible.map((m) => (
                  <li key={m.id} className={`${card} p-5 ${m.handled ? "opacity-75" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink">{m.name}</span>
                          {m.sample && <SampleBadge />}
                          {m.handled && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">{t("handled")}</span>
                          )}
                        </p>
                        <p className="text-sm text-muted">
                          {dialable(m.phone) ? (
                            <a href={`tel:${m.phone}`} className="tabular-nums underline-offset-2 hover:text-brand hover:underline">
                              {m.phone}
                            </a>
                          ) : (
                            <span className="tabular-nums">{m.phone}</span>
                          )}
                          {" · "}
                          {m.receivedAt ? format.dateTime(new Date(m.receivedAt), { dateStyle: "medium", timeStyle: "short" }) : "—"}
                          {m.locale && ` · ${m.locale === "en" ? "English" : "বাংলা"}`}
                        </p>
                      </div>
                      <button type="button" onClick={() => void toggle(m)} disabled={busy === m.id} className={btnOutline}>
                        {m.handled ? t("reopen") : t("markHandled")}
                      </button>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-ink">{m.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }}
    </OfficeState>
  );
}
