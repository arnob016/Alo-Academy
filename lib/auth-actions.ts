"use server";

import { getCourse } from "@/content/courses";
import type { TrackedApplication } from "./actions";
import { listAdmissions } from "./admissions";
import { hashPassword, verifyPassword } from "./passwords";
import { REF_PATTERN } from "./ref";
import { nextClassStart } from "./schedule";
import {
  clearAttempts,
  clientIp,
  currentUser,
  endSession,
  recordFailedAttempt,
  startSession,
  tooManyAttempts,
} from "./session";
import { safeNext } from "./session-token";
import { listAllTrials } from "./trials";
import { verifyTurnstile } from "./turnstile";
import { createUser, findUserByEmail, findUserByLogin, findUserByPhone, linkRefs, updateUser, type User } from "./users";
import {
  fieldErrors,
  linkSchema,
  normalizePhone,
  registerSchema,
  samePhone,
  signInSchema,
  type ErrorKey,
  type LinkField,
  type RegisterField,
  type SignInField,
} from "./validation";

type Locale = "bn" | "en";
const localeOf = (formData: FormData): Locale => (formData.get("locale") === "en" ? "en" : "bn");
const landing = (user: User, locale: Locale) => `/${locale}/${user.role === "staff" ? "dashboard" : "account"}`;

export type AuthResult<F extends string> =
  | { ok: true; redirect: string }
  | { ok: false; fieldErrors?: Partial<Record<F, ErrorKey>>; formError?: ErrorKey };

/** Starts the session; false (with the reason logged) if it can't, e.g. AUTH_SECRET is missing in production. */
async function trySession(user: User) {
  try {
    await startSession(user);
    return true;
  } catch (error) {
    console.error("[auth] could not start a session", error);
    return false;
  }
}

// Compared against when the login ID is unknown, so a miss takes as long as a wrong password.
let dummyHash: Promise<string> | undefined;

export async function signIn(formData: FormData): Promise<AuthResult<SignInField>> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors<SignInField>(parsed.error) };
  const { login, password } = parsed.data;

  const idKey = `login:${login.includes("@") ? login.toLowerCase() : normalizePhone(login)}`;
  const keys = [idKey, `ip:${await clientIp()}`];
  if (tooManyAttempts(keys)) return { ok: false, formError: "rateLimited" };

  let user: User | undefined;
  try {
    user = await findUserByLogin(login);
  } catch (error) {
    console.error("[auth] user lookup failed", error);
    return { ok: false, formError: "generic" };
  }

  dummyHash ??= hashPassword("not-a-real-password");
  const valid = await verifyPassword(password, user?.passwordHash || (await dummyHash));
  if (!user || !user.passwordHash || !valid) {
    recordFailedAttempt(keys);
    return { ok: false, formError: "credentials" };
  }
  // Only the ID's counter: signing into your own account mustn't reset an IP's count.
  clearAttempts([idKey]);

  const found = user;
  const signedIn = await updateUser(found.id, (u) => ({ ...u, lastLogin: Date.now() })).catch((error) => {
    console.error("[auth] last-login update failed", error);
    return { ...found, lastLogin: Date.now() };
  });
  if (!(await trySession(signedIn))) return { ok: false, formError: "generic" };
  return { ok: true, redirect: safeNext(formData.get("next")?.toString()) ?? landing(signedIn, localeOf(formData)) };
}

export async function register(formData: FormData): Promise<AuthResult<RegisterField>> {
  // Honeypot filled: pretend nothing happened, create nothing.
  if (formData.get("website")) return { ok: false, formError: "generic" };

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors<RegisterField>(parsed.error) };
  const { name, phone, email, password } = parsed.data;

  try {
    if (await findUserByPhone(phone)) return { ok: false, fieldErrors: { phone: "phoneTaken" } };
    if (email && (await findUserByEmail(email))) return { ok: false, fieldErrors: { email: "emailTaken" } };
  } catch (error) {
    console.error("[auth] user lookup failed", error);
    return { ok: false, formError: "generic" };
  }
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) {
    return { ok: false, formError: "verification" };
  }

  let user: User;
  try {
    user = await createUser({
      name,
      email,
      // Typed in, never proven: never used to merge with a Google/Facebook account.
      emailVerified: false,
      phone,
      passwordHash: await hashPassword(password),
      // Staff are promoted in the Sheet, never by what someone types here.
      role: "parent",
      googleId: "",
      facebookId: "",
    });
  } catch (error) {
    console.error("[auth] failed to create user", error);
    return { ok: false, formError: "generic" };
  }
  if (!(await trySession(user))) return { ok: false, formError: "generic" };
  return { ok: true, redirect: safeNext(formData.get("next")?.toString()) ?? landing(user, localeOf(formData)) };
}

export async function signOut() {
  await endSession();
}

/* ---------- My account ---------- */

export type AccountTrial = {
  ref: string;
  studentName: string;
  courseId: string;
  batchId: string;
  courseName: string;
  batchName: string;
  classAt: number;
};

export type AccountView = {
  user: {
    name: string;
    email: string;
    phone: string;
    role: User["role"];
    google: boolean;
    facebook: boolean;
    hasPassword: boolean;
    demo: boolean;
  };
  applications: TrackedApplication[];
  trials: AccountTrial[];
};

export async function getMyAccount(): Promise<{ ok: true; account: AccountView } | { ok: false; error: "signedOut" | "generic" }> {
  let user: User | null;
  try {
    user = await currentUser();
  } catch (error) {
    // A failed Sheet read isn't a sign-out: say so, rather than send the person to the login page.
    console.error("[account] user lookup failed", error);
    return { ok: false, error: "generic" };
  }
  if (!user) {
    // Expired token or deleted account: clear the cookies so the header stops showing a name.
    await endSession();
    return { ok: false, error: "signedOut" };
  }

  try {
    const refs = new Set(user.linkedRefs);
    const [admissions, trials] = await Promise.all([listAdmissions(), listAllTrials()]);
    const now = Date.now();

    const applications = admissions
      .filter((a) => refs.has(a.ref))
      .map((a): TrackedApplication => {
        const batch = getCourse(a.courseId)?.batches.find((b) => b.id === a.batchId);
        return {
          ref: a.ref,
          studentName: a.studentName,
          courseId: a.courseId,
          batchId: a.batchId,
          courseName: a.courseName,
          batchName: a.batchName,
          submittedAt: a.submittedAt,
          status: a.status,
          amount: a.amount,
          method: a.method,
          firstClass:
            a.status === "Approved" && batch
              ? (nextClassStart(batch.slot, new Date(Math.max(now, a.submittedAt)))?.getTime() ?? null)
              : null,
        };
      });

    const accountTrials = trials
      .filter((t) => refs.has(t.ref))
      .sort((a, b) => b.classAt - a.classAt)
      .map((t) => ({
        ref: t.ref,
        studentName: t.studentName,
        courseId: t.courseId,
        batchId: t.batchId,
        courseName: t.courseName,
        batchName: t.batchName,
        classAt: t.classAt,
      }));

    return {
      ok: true,
      account: {
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          google: Boolean(user.googleId),
          facebook: Boolean(user.facebookId),
          hasPassword: Boolean(user.passwordHash),
          demo: Boolean(user.demo),
        },
        applications,
        trials: accountTrials,
      },
    };
  } catch (error) {
    console.error("[account] failed to load", error);
    return { ok: false, error: "generic" };
  }
}

export type LinkResult =
  | { ok: true; ref: string }
  | { ok: false; fieldErrors?: Partial<Record<LinkField, ErrorKey>>; formError?: ErrorKey };

/** Adds an earlier application or trial booking, proven by its reference + phone (like the tracker). */
export async function linkApplication(formData: FormData): Promise<LinkResult> {
  const user = await currentUser().catch(() => null);
  if (!user) return { ok: false, formError: "generic" };

  const parsed = linkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors<LinkField>(parsed.error) };
  const { ref, phone } = parsed.data;

  const keys = [`link:${user.id}`];
  if (tooManyAttempts(keys)) return { ok: false, formError: "rateLimited" };

  try {
    let matches = false;
    if (REF_PATTERN.test(ref)) {
      const found = (await listAdmissions()).find((a) => a.ref === ref);
      matches = Boolean(found && (samePhone(found.studentPhone, phone) || samePhone(found.guardianPhone, phone)));
    } else {
      const found = (await listAllTrials()).find((t) => t.ref === ref);
      matches = Boolean(found && samePhone(found.guardianPhone, phone));
    }
    // Same answer for "no such ref" and "wrong phone", so refs can't be probed.
    if (!matches) {
      recordFailedAttempt(keys);
      return { ok: false, formError: "notFound" };
    }
    await linkRefs(user, [ref]);
    return { ok: true, ref };
  } catch (error) {
    console.error("[account] failed to link", error);
    return { ok: false, formError: "generic" };
  }
}
