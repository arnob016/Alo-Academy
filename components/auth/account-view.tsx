"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import type { CourseNames } from "@/content/courses";
import { getMyAccount, linkApplication, signOut, type AccountView as Account } from "@/lib/auth-actions";
import { notifyAuthChange } from "@/lib/use-who";
import type { ErrorKey, LinkField } from "@/lib/validation";
import { describedBy, Field, inputClass } from "../forms/field";
import { TrackResult, type Center } from "../track/track-form";
import { btnSecondary, card } from "../ui";

type Provider = "google" | "facebook";

type Props = {
  locale: "bn" | "en";
  courses: CourseNames;
  center: Center;
  providers: Record<Provider, boolean>;
};

const statusPill = {
  Pending: "bg-accent/25 text-ink",
  Approved: "bg-emerald-100 text-emerald-900",
  Rejected: "bg-red-100 text-red-900",
} as const;

const urlErrors = ["oauth_failed", "oauth_cancelled", "oauth_in_use"] as const;

/** Reads ?connected= / ?error= left by the Google/Facebook "connect" round trip. */
export function AccountViewFromUrl(props: Props) {
  const params = useSearchParams();
  const provider: Provider = params.get("provider") === "facebook" || params.get("connected") === "facebook" ? "facebook" : "google";
  const connected = params.get("connected") === "google" || params.get("connected") === "facebook";
  const error = urlErrors.find((e) => e === params.get("error")) ?? null;
  return <AccountView {...props} notice={connected ? { kind: "connected", provider } : error ? { kind: error, provider } : null} />;
}

export function AccountView({
  locale,
  courses,
  center,
  providers,
  notice = null,
}: Props & { notice?: { kind: "connected" | (typeof urlErrors)[number]; provider: Provider } | null }) {
  const t = useTranslations("account");
  const tAuth = useTranslations("auth");
  const format = useFormatter();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [signingOut, startSignOut] = useTransition();

  useEffect(() => {
    let alive = true;
    getMyAccount()
      .catch(() => ({ ok: false as const, error: "generic" as const }))
      .then((res) => {
        if (!alive) return;
        if (res.ok) {
          setAccount(res.account);
          setLoadError(false);
        } else if (res.error === "signedOut") {
          notifyAuthChange();
          router.replace(`/${locale}/login?next=${encodeURIComponent(`/${locale}/account`)}`);
        } else {
          setLoadError(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [reload, locale, router]);

  function onSignOut() {
    startSignOut(async () => {
      try {
        await signOut();
      } catch {
        // Not signed out (e.g. offline); the button is enabled again to retry.
        return;
      }
      notifyAuthChange();
      router.push(`/${locale}`);
    });
  }

  if (loadError) return <p className={`${card} p-6 text-muted`}>{t("loadError")}</p>;
  if (!account) {
    return (
      <p aria-busy="true" className={`${card} p-6 text-muted`}>
        {t("loading")}
      </p>
    );
  }

  const { user, applications, trials } = account;
  const providerLabel = (p: Provider) => tAuth(`providers.${p}`);
  const connectHref = (p: Provider) =>
    `/api/auth/${p}?${new URLSearchParams({ locale, link: "1", next: `/${locale}/account` })}`;
  const name = (courseId: string, fallback: string) => courses[courseId]?.name ?? fallback;
  const batch = (courseId: string, batchId: string, fallback: string) => courses[courseId]?.batches[batchId] ?? fallback;
  const when = (ms: number, withTime = false) =>
    format.dateTime(new Date(ms), withTime ? { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" } : { dateStyle: "medium" });

  return (
    <div className="space-y-8">
      {notice && (
        <p role="status" className={`rounded-lg p-4 font-medium ${notice.kind === "connected" ? "bg-emerald-50 text-emerald-900" : "bg-accent/20 text-ink"}`}>
          {notice.kind === "connected"
            ? t("profile.connectedNow", { provider: providerLabel(notice.provider) })
            : tAuth(`urlErrors.${notice.kind}`, { provider: providerLabel(notice.provider) })}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-brand">{t("hello", { name: user.name })}</h2>
          <p className="mt-1 text-muted">
            {t(`role.${user.role}`)}
            {user.demo && <span className="ml-2 text-sm">· {t("demoNote")}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {user.role === "staff" && (
            <Link href={`/${locale}/dashboard`} className="rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark">
              {t("office")}
            </Link>
          )}
          <button type="button" onClick={onSignOut} disabled={signingOut} className={`${btnSecondary} py-2.5 disabled:opacity-60`}>
            {t("signOut")}
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-8">
          {/* Applications */}
          <section aria-labelledby="my-applications" className="space-y-3">
            <h3 id="my-applications" className="text-lg font-semibold text-brand">
              {t("applications")}
            </h3>
            {applications.length === 0 ? (
              <div className={`${card} p-5 text-muted`}>
                <p>{t("noApplications")}</p>
                <Link href={`/${locale}/admission`} className="mt-3 inline-block font-semibold text-brand underline-offset-4 hover:underline">
                  {t("apply")} →
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {applications.map((a) => (
                  <li key={a.ref} className={`${card} p-5`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">
                          {a.studentName} · {name(a.courseId, a.courseName)}
                        </p>
                        <p className="text-sm text-muted">
                          {batch(a.courseId, a.batchId, a.batchName)} · <span className="font-mono">{a.ref}</span>
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {t("applied", { date: when(a.submittedAt) })}
                          {a.firstClass ? ` · ${t("firstClass", { date: when(a.firstClass, true) })}` : ""}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusPill[a.status]}`}>{t(`status.${a.status}`)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(open === a.ref ? null : a.ref)}
                      aria-expanded={open === a.ref}
                      className="mt-3 text-sm font-semibold text-brand underline-offset-4 hover:underline"
                    >
                      {t("view")} {open === a.ref ? "▴" : "▾"}
                    </button>
                    {open === a.ref && (
                      <div className="mt-4">
                        <TrackResult application={a} courses={courses} center={center} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Trials */}
          <section aria-labelledby="my-trials" className="space-y-3">
            <h3 id="my-trials" className="text-lg font-semibold text-brand">
              {t("trials")}
            </h3>
            {trials.length === 0 ? (
              <div className={`${card} p-5 text-muted`}>
                <p>{t("noTrials")}</p>
                <Link href={`/${locale}/trial`} className="mt-3 inline-block font-semibold text-brand underline-offset-4 hover:underline">
                  {t("bookTrial")} →
                </Link>
              </div>
            ) : (
              <ul className={`${card} divide-y divide-brand/10`}>
                {trials.map((trial) => (
                  <li key={trial.ref} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-semibold text-ink">{when(trial.classAt, true)}</p>
                      <p className="text-sm text-muted">
                        {trial.studentName} · {name(trial.courseId, trial.courseName)}, {batch(trial.courseId, trial.batchId, trial.batchName)}
                      </p>
                    </div>
                    <span className="font-mono text-sm text-muted">{trial.ref}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-8">
          <LinkForm onLinked={() => setReload((n) => n + 1)} />

          {/* Profile */}
          <section aria-labelledby="profile" className={`${card} p-5`}>
            <h3 id="profile" className="font-semibold text-brand">
              {t("profile.title")}
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted">{t("profile.phone")}</dt>
                <dd className="font-medium text-ink tabular-nums">{user.phone || t("profile.none")}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("profile.email")}</dt>
                <dd className="font-medium break-all text-ink">{user.email || t("profile.none")}</dd>
              </div>
            </dl>
            <h4 className="mt-5 text-sm font-semibold text-ink">{t("profile.methods")}</h4>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span>{t("profile.password")}</span>
                <span className={user.hasPassword ? "font-semibold text-emerald-800" : "text-muted"}>
                  {user.hasPassword ? `✓ ${t("profile.connected")}` : t("profile.notSet")}
                </span>
              </li>
              {(["google", "facebook"] as const).map((p) => (
                <li key={p} className="flex items-center justify-between gap-3">
                  <span>{providerLabel(p)}</span>
                  {user[p] ? (
                    <span className="font-semibold text-emerald-800">✓ {t("profile.connected")}</span>
                  ) : providers[p] && !user.demo ? (
                    <a href={connectHref(p)} className="rounded-md border border-brand/30 px-2.5 py-1 font-semibold text-brand hover:bg-brand hover:text-white">
                      {t("profile.connect")}
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </li>
              ))}
            </ul>
            {!(providers.google && providers.facebook) && <p className="mt-3 text-xs text-muted">{t("profile.notConnected")}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function LinkForm({ onLinked }: { onLinked: () => void }) {
  const t = useTranslations("account.link");
  const tErrors = useTranslations("errors");
  const [values, setValues] = useState({ ref: "", phone: "" });
  const [errors, setErrors] = useState<Partial<Record<LinkField, ErrorKey>>>({});
  const [formError, setFormError] = useState<ErrorKey | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await linkApplication(data).catch(() => ({ ok: false as const, fieldErrors: undefined, formError: "generic" as const }));
      if (res.ok) {
        setAdded(res.ref);
        setValues({ ref: "", phone: "" });
        setErrors({});
        setFormError(null);
        onLinked();
        return;
      }
      setAdded(null);
      setErrors(res.fieldErrors ?? {});
      setFormError(res.formError ?? null);
    });
  }

  const input = (name: LinkField) => ({
    id: `link-${name}`,
    name,
    value: values[name],
    onChange: (e: { target: { value: string } }) => {
      setValues((prev) => ({ ...prev, [name]: e.target.value }));
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    },
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": describedBy(`link-${name}`, undefined, errors[name]),
    className: inputClass,
  });

  return (
    <section aria-labelledby="link-title" className={`${card} p-5`}>
      <h3 id="link-title" className="font-semibold text-brand">
        {t("title")}
      </h3>
      <p className="mt-1 text-sm text-muted">{t("text")}</p>
      <form noValidate onSubmit={onSubmit} className="mt-4 space-y-4">
        <Field id="link-ref" label={t("ref")} error={errors.ref && tErrors(errors.ref)}>
          <input {...input("ref")} autoComplete="off" spellCheck={false} className={`${inputClass} font-mono uppercase`} />
        </Field>
        <Field id="link-phone" label={t("phone")} error={errors.phone && tErrors(errors.phone)}>
          <input {...input("phone")} type="tel" inputMode="tel" placeholder="017XXXXXXXX" />
        </Field>
        <div aria-live="polite" className="empty:hidden">
          {formError && <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{tErrors(formError)}</p>}
          {added && <p className="rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-900">{t("added", { ref: added })}</p>}
        </div>
        <button type="submit" disabled={pending} className="w-full rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {pending ? t("adding") : t("submit")}
        </button>
      </form>
    </section>
  );
}
