"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { listOfficeUsers, setOfficeUserRole, type OfficeUser } from "@/lib/admin-actions";
import type { OfficeErrorKey } from "@/lib/office-validation";
import type { Role } from "@/lib/session-token";
import { card } from "../ui";
import { btnOutline, chip, ErrorNote, inputClass, OfficeState, SourceBar, useErrorText, useOfficeData } from "./office-ui";

const roleFilters = ["all", "staff", "parent"] as const;

export function UsersOffice() {
  const t = useTranslations("office.users");
  const tOffice = useTranslations("office");
  const format = useFormatter();
  const errorText = useErrorText();
  const { state, reload, reloadError } = useOfficeData(listOfficeUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof roleFilters)[number]>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<OfficeErrorKey | null>(null);
  const [changed, setChanged] = useState<string | null>(null);

  async function changeRole(user: OfficeUser, role: Role) {
    const question = role === "staff" ? t("makeStaffConfirm", { name: user.name }) : t("makeParentConfirm", { name: user.name });
    if (!window.confirm(question)) return;
    setBusy(user.id);
    setError(null);
    setChanged(null);
    const res = await setOfficeUserRole(user.id, role).catch(() => ({ ok: false as const, error: "generic" as const }));
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setChanged(user.name);
    await reload();
  }

  const date = (ms: number) => (ms ? format.dateTime(new Date(ms), { dateStyle: "medium" }) : "—");

  return (
    <OfficeState state={state}>
      {(data) => {
        const needle = query.trim().toLowerCase();
        const digits = needle.replace(/\D/g, "");
        const visible = data.users.filter(
          (u) =>
            (roleFilter === "all" || u.role === roleFilter) &&
            (!needle ||
              u.name.toLowerCase().includes(needle) ||
              u.email.toLowerCase().includes(needle) ||
              (digits !== "" && u.phone.includes(digits))),
        );
        const count = (role: Role) => data.users.filter((u) => u.role === role).length;

        return (
          <div className="space-y-6">
            <SourceBar source={data.source} onRefresh={() => void reload()} reloadError={reloadError} />

            {!data.canChangeRoles && <p className="rounded-md bg-accent/20 p-3 text-sm text-ink">{t("demoNote")}</p>}
            <div aria-live="polite">
              {error && <ErrorNote>{errorText(error)}</ErrorNote>}
              {changed && <p className="rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-900">{t("changed", { name: changed })}</p>}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div role="group" aria-label={tOffice("filter")} className="flex flex-wrap gap-2">
                {roleFilters.map((f) => (
                  <button key={f} type="button" onClick={() => setRoleFilter(f)} aria-pressed={roleFilter === f} className={chip(roleFilter === f)}>
                    {t(`filters.${f}`)}{" "}
                    <span className={roleFilter === f ? "text-white/75" : "text-muted"}>
                      {format.number(f === "all" ? data.users.length : count(f))}
                    </span>
                  </button>
                ))}
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
                className={`${inputClass} sm:w-72`}
              />
            </div>

            <div className={`${card} relative overflow-x-auto`}>
              {visible.length === 0 ? (
                <p className="p-6 text-muted">{t("empty")}</p>
              ) : (
                <table className="w-full min-w-[48rem] text-sm">
                  <thead>
                    <tr className="bg-surface text-left text-xs tracking-wide text-muted uppercase">
                      <th scope="col" className="px-5 py-2 font-semibold">{t("name")}</th>
                      <th scope="col" className="py-2 font-semibold">{t("contact")}</th>
                      <th scope="col" className="py-2 font-semibold">{t("signIn")}</th>
                      <th scope="col" className="py-2 font-semibold">{t("dates")}</th>
                      <th scope="col" className="px-5 py-2 text-right font-semibold">{t("role")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand/10">
                    {visible.map((u) => {
                      const self = u.id === data.me;
                      const locked = !data.canChangeRoles || self || u.demo || (u.role === "staff" && u.staffEmail);
                      return (
                        <tr key={u.id}>
                          <td className="px-5 py-3">
                            <p className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-ink">{u.name || "—"}</span>
                              {self && <span className="rounded bg-brand/10 px-1.5 py-0.5 text-xs font-semibold text-brand">{t("you")}</span>}
                              {u.demo && (
                                <span className="rounded border border-dashed border-zinc-400 px-1.5 py-0.5 text-xs font-semibold text-zinc-600">
                                  {t("demo")}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted">{t("linked", { count: u.linked })}</p>
                          </td>
                          <td className="py-3 text-muted">
                            {u.email && <p className="break-all">{u.email}</p>}
                            {u.phone && <p className="tabular-nums">{u.phone}</p>}
                            {!u.email && !u.phone && "—"}
                          </td>
                          <td className="py-3 text-muted">{u.methods.map((m) => t(`methods.${m}`)).join(", ") || "—"}</td>
                          <td className="py-3 text-xs text-muted">
                            <p>{t("created", { date: date(u.createdAt) })}</p>
                            <p>{t("lastLogin", { date: date(u.lastLogin) })}</p>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  u.role === "staff" ? "bg-brand text-white" : "bg-ink/10 text-ink"
                                }`}
                              >
                                {t(`roles.${u.role}`)}
                              </span>
                              {!locked && (
                                <button
                                  type="button"
                                  onClick={() => void changeRole(u, u.role === "staff" ? "parent" : "staff")}
                                  disabled={busy === u.id}
                                  className={btnOutline}
                                >
                                  {u.role === "staff" ? t("makeParent") : t("makeStaff")}
                                </button>
                              )}
                              {u.role === "staff" && u.staffEmail && <span className="max-w-48 text-xs text-muted">{t("staffEmail")}</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <p className="text-sm text-muted">{t("signInAgain")}</p>
          </div>
        );
      }}
    </OfficeState>
  );
}
