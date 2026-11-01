"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { register, signIn } from "@/lib/auth-actions";
import { notifyAuthChange } from "@/lib/use-who";
import type { ErrorKey, RegisterField, SignInField } from "@/lib/validation";
import { describedBy, Field, Honeypot, inputClass } from "../forms/field";
import { Turnstile } from "../forms/turnstile";
import { card } from "../ui";

type Provider = "google" | "facebook";
type DemoLogin = { login: string; password: string };

type Props = {
  locale: "bn" | "en";
  providers: Record<Provider, boolean>;
  /** Shown only in demo mode. */
  demoAccounts: { parent: DemoLogin; staff: DemoLogin } | null;
  turnstileSiteKey: string;
};

const urlErrors = ["oauth_failed", "oauth_cancelled", "oauth_email_exists", "oauth_in_use", "provider_unavailable"] as const;

export function LoginPanelFromUrl(props: Props) {
  const params = useSearchParams();
  const error = urlErrors.find((e) => e === params.get("error")) ?? null;
  const provider = params.get("provider") === "facebook" ? "facebook" : "google";
  return (
    <LoginPanel
      {...props}
      next={params.get("next") ?? ""}
      staffNeeded={params.get("staff") === "1"}
      urlError={error ? { error, provider } : null}
    />
  );
}

export function LoginPanel({
  locale,
  providers,
  demoAccounts,
  turnstileSiteKey,
  next = "",
  staffNeeded = false,
  urlError = null,
}: Props & {
  next?: string;
  staffNeeded?: boolean;
  urlError?: { error: (typeof urlErrors)[number]; provider: Provider } | null;
}) {
  const t = useTranslations("auth");
  const [tab, setTab] = useState<"signIn" | "register">("signIn");
  const [demoFill, setDemoFill] = useState<DemoLogin | null>(null);
  const showProviders = providers.google || providers.facebook || demoAccounts !== null;

  const providerHref = (provider: Provider) => {
    const params = new URLSearchParams({ locale });
    if (next) params.set("next", next);
    return `/api/auth/${provider}?${params}`;
  };

  return (
    <div className="space-y-6">
      {(staffNeeded || urlError) && (
        <p role="alert" className="rounded-lg bg-accent/20 p-4 font-medium text-ink">
          {urlError
            ? t(`urlErrors.${urlError.error}`, { provider: t(`providers.${urlError.provider}`) })
            : t("staffNeeded")}
        </p>
      )}

      <div className={`${card} overflow-hidden`}>
        <div role="tablist" aria-label={t("title")} className="grid grid-cols-2 border-b border-brand/10">
          {(["signIn", "register"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={`py-3.5 font-semibold transition-colors ${
                tab === id ? "border-b-2 border-brand text-brand" : "text-muted hover:text-ink"
              }`}
            >
              {t(`tabs.${id}`)}
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8">
          <div role="tabpanel" id="panel-signIn" aria-labelledby="tab-signIn" hidden={tab !== "signIn"}>
            {/* Remount when a demo account is filled in, so the fields take its values. */}
            <SignInForm key={demoFill ? demoFill.login : "blank"} locale={locale} next={next} initial={demoFill} />
          </div>
          <div role="tabpanel" id="panel-register" aria-labelledby="tab-register" hidden={tab !== "register"}>
            <RegisterForm locale={locale} next={next} turnstileSiteKey={turnstileSiteKey} />
          </div>

          {showProviders && (
            <>
              <p className="my-6 flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-ink/15 after:h-px after:flex-1 after:bg-ink/15">
                {t("or")}
              </p>
              <div className="grid gap-3">
                <ProviderButton href={providers.google ? providerHref("google") : null} icon={<GoogleMark />}>
                  {t("google")}
                </ProviderButton>
                <ProviderButton href={providers.facebook ? providerHref("facebook") : null} icon={<FacebookMark />}>
                  {t("facebook")}
                </ProviderButton>
              </div>
              {!(providers.google && providers.facebook) && <p className="mt-3 text-sm text-muted">{t("notConnected")}</p>}
            </>
          )}
        </div>
      </div>

      {demoAccounts && (
        <section aria-labelledby="demo-accounts" className="rounded-lg border-2 border-dashed border-zinc-900 bg-zinc-50 p-5 text-zinc-900">
          <h2 id="demo-accounts" className="font-bold">
            {t("demo.title")}
          </h2>
          <p className="mt-1 text-sm">{t("demo.text")}</p>
          <ul className="mt-4 space-y-3">
            {(["parent", "staff"] as const).map((role) => (
              <li key={role} className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm">
                  <span className="font-semibold">{t(`demo.${role}`)}</span>
                  <span className="block font-mono text-xs">
                    {demoAccounts[role].login} · {demoAccounts[role].password}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTab("signIn");
                    setDemoFill(demoAccounts[role]);
                  }}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  {t("demo.use")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function useAuthForm<F extends string>() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Partial<Record<F, ErrorKey>>>({});
  const [formError, setFormError] = useState<ErrorKey | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(
    event: FormEvent<HTMLFormElement>,
    action: (data: FormData) => Promise<
      { ok: true; redirect: string } | { ok: false; fieldErrors?: Partial<Record<F, ErrorKey>>; formError?: ErrorKey }
    >,
    afterError?: () => void,
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      // A dropped connection rejects the call; show it as a form error, not a crashed page.
      const res = await action(data).catch(() => ({ ok: false as const, fieldErrors: undefined, formError: "generic" as const }));
      if (res.ok) {
        notifyAuthChange();
        router.push(res.redirect);
        return;
      }
      setErrors(res.fieldErrors ?? {});
      setFormError(res.formError ?? null);
      afterError?.();
      const firstInvalid = Object.keys(res.fieldErrors ?? {})[0];
      if (firstInvalid) formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
    });
  }

  const clear = (field: F) => errors[field] && setErrors((prev) => ({ ...prev, [field]: undefined }));
  return { formRef, errors, formError, pending, submit, clear };
}

function SignInForm({ locale, next, initial }: { locale: string; next: string; initial: DemoLogin | null }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const { formRef, errors, formError, pending, submit, clear } = useAuthForm<SignInField>();
  const [show, setShow] = useState(false);
  const err = (f: SignInField) => (errors[f] ? tErrors(errors[f]) : undefined);

  return (
    <form ref={formRef} noValidate onSubmit={(e) => submit(e, signIn)} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <FormError error={formError} />
      <Field id="signin-login" label={t("login")} hint={t("loginHint")} error={err("login")}>
        <input
          id="signin-login"
          name="login"
          type="text"
          autoComplete="username"
          defaultValue={initial?.login}
          onChange={() => clear("login")}
          aria-invalid={errors.login ? true : undefined}
          aria-describedby={describedBy("signin-login", t("loginHint"), errors.login)}
          className={inputClass}
        />
      </Field>
      <PasswordField
        id="signin-password"
        label={t("password")}
        autoComplete="current-password"
        defaultValue={initial?.password}
        error={err("password")}
        show={show}
        onToggle={() => setShow((s) => !s)}
        onChange={() => clear("password")}
      />
      <button
        type="submit"
        disabled={pending}
        // After a demo account is filled in, bring "Sign in" into view (clear of the sticky header) so Enter signs in.
        autoFocus={initial !== null}
        className="w-full scroll-mt-24 scroll-mb-24 rounded-md bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? t("signingIn") : t("signIn")}
      </button>
    </form>
  );
}

function RegisterForm({ locale, next, turnstileSiteKey }: { locale: string; next: string; turnstileSiteKey: string }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const tForm = useTranslations("form");
  const [captchaActive, setCaptchaActive] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [show, setShow] = useState(false);
  const { formRef, errors, formError, pending, submit, clear } = useAuthForm<RegisterField>();
  const err = (f: RegisterField) => (errors[f] ? tErrors(errors[f]) : undefined);
  const input = (name: RegisterField, hint?: string) => ({
    id: `register-${name}`,
    name,
    onChange: () => clear(name),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": describedBy(`register-${name}`, hint, errors[name]),
    className: inputClass,
  });

  return (
    <form
      ref={formRef}
      noValidate
      onFocus={() => setCaptchaActive(true)}
      onSubmit={(e) => submit(e, register, () => setResetSignal((n) => n + 1))}
      className="relative space-y-5"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <FormError error={formError} />
      <Field id="register-name" label={t("name")} error={err("name")}>
        <input {...input("name")} type="text" autoComplete="name" maxLength={60} />
      </Field>
      <Field id="register-phone" label={t("phone")} hint={tForm("phoneHint")} error={err("phone")}>
        <input {...input("phone", tForm("phoneHint"))} type="tel" inputMode="tel" autoComplete="tel" placeholder="01700000000" />
      </Field>
      <Field id="register-email" label={t("email")} error={err("email")}>
        <input {...input("email")} type="email" autoComplete="email" maxLength={254} />
      </Field>
      <PasswordField
        id="register-password"
        label={t("newPassword")}
        hint={t("passwordHint")}
        autoComplete="new-password"
        error={err("password")}
        show={show}
        onToggle={() => setShow((s) => !s)}
        onChange={() => clear("password")}
      />
      <Honeypot label={tForm("honeypot")} />
      <Turnstile siteKey={turnstileSiteKey} active={captchaActive} resetSignal={resetSignal} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? t("registering") : t("register")}
      </button>
    </form>
  );
}

function PasswordField({
  id,
  label,
  hint,
  error,
  autoComplete,
  defaultValue,
  show,
  onToggle,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  autoComplete: string;
  defaultValue?: string;
  show: boolean;
  onToggle: () => void;
  onChange: () => void;
}) {
  const t = useTranslations("auth");
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          name="password"
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          maxLength={128}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={`${inputClass} pr-20`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={show}
          aria-controls={id}
          className="absolute top-1/2 right-2 mt-0.75 -translate-y-1/2 rounded px-2 py-1 text-sm font-semibold text-brand hover:bg-brand/10"
        >
          {show ? t("hide") : t("show")}
        </button>
      </div>
    </Field>
  );
}

function FormError({ error }: { error: ErrorKey | null }) {
  const tErrors = useTranslations("errors");
  return (
    <div aria-live="polite" className="empty:hidden">
      {error && <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{tErrors(error)}</p>}
    </div>
  );
}

function ProviderButton({ href, icon, children }: { href: string | null; icon: ReactNode; children: ReactNode }) {
  const className =
    "flex w-full items-center justify-center gap-3 rounded-md border border-ink/20 bg-white px-4 py-3 font-semibold text-ink transition-colors";
  // A plain link: OAuth needs a full-page redirect, not client-side navigation.
  return href ? (
    <a href={href} className={`${className} hover:border-ink/40 hover:bg-ink/5`}>
      {icon}
      {children}
    </a>
  ) : (
    <button type="button" disabled className={`${className} cursor-not-allowed opacity-50`}>
      {icon}
      {children}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"
      />
    </svg>
  );
}
