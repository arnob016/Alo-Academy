"use server";

import { site } from "@/config/site";
import { maskPhone } from "./admissions";
import { listContactMessages, setMessageHandled, type ContactMessage } from "./contact-messages";
import type { DataSource, OfficeFailure } from "./office-actions";
import { requireStaff } from "./session";
import { roles, type Role } from "./session-token";
import { sheetsConfigured } from "./sheets";
import { isStaffEmail, listUsers, updateUser, type User } from "./users";

/*
 * Office: accounts and contact-form messages. Staff only. In demo mode the
 * staff login is public, so contact details are masked and the demo account
 * can't change anyone's role.
 */

const unauthorized: OfficeFailure = { ok: false, error: "unauthorized" };
const generic: OfficeFailure = { ok: false, error: "generic" };
const source = (): DataSource => (sheetsConfigured() ? "sheet" : "memory");

/** "rahim.uddin@gmail.com" → "r•••@gmail.com". */
const maskEmail = (email: string) => email.replace(/^(.)[^@]*(@.*)$/, "$1•••$2");

/** Verified STAFF_EMAILS addresses are made staff again on every Google/Facebook sign-in. */
const staffByEmail = (u: User) => u.emailVerified && Boolean(u.email) && isStaffEmail(u.email);

/* ---------- Users ---------- */

export type OfficeUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  createdAt: number;
  lastLogin: number;
  /** How they can sign in. */
  methods: ("password" | "google" | "facebook")[];
  linked: number;
  demo: boolean;
  staffEmail: boolean;
};

export type UsersResult =
  | { ok: true; users: OfficeUser[]; me: string; canChangeRoles: boolean; source: DataSource }
  | OfficeFailure;

export async function listOfficeUsers(): Promise<UsersResult> {
  const me = await requireStaff();
  if (!me) return unauthorized;
  try {
    const masked = site.demo.enabled;
    const users = (await listUsers()).map(
      (u): OfficeUser => ({
        id: u.id,
        name: u.name,
        email: masked ? maskEmail(u.email) : u.email,
        phone: masked ? maskPhone(u.phone) : u.phone,
        role: u.role,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        methods: [
          ...(u.passwordHash ? (["password"] as const) : []),
          ...(u.googleId ? (["google"] as const) : []),
          ...(u.facebookId ? (["facebook"] as const) : []),
        ],
        linked: u.linkedRefs.length,
        demo: Boolean(u.demo),
        staffEmail: staffByEmail(u),
      }),
    );
    return { ok: true, users, me: me.id, canChangeRoles: !me.demo, source: source() };
  } catch (error) {
    console.error("[office] failed to list users", error);
    return generic;
  }
}

export async function setOfficeUserRole(id: string, role: Role): Promise<{ ok: true } | OfficeFailure> {
  const me = await requireStaff();
  if (!me) return unauthorized;
  if (typeof id !== "string" || !roles.includes(role)) return { ok: false, error: "notFound" };
  if (me.demo) return { ok: false, error: "demo" };
  // Nobody can lock themselves out of the office.
  if (id === me.id) return { ok: false, error: "self" };
  try {
    const user = (await listUsers()).find((u) => u.id === id);
    if (!user) return { ok: false, error: "notFound" };
    if (user.demo) return { ok: false, error: "demo" };
    if (role === "parent" && staffByEmail(user)) return { ok: false, error: "staffEmail" };
    if (user.role !== role) await updateUser(user.id, (u) => ({ ...u, role }));
    return { ok: true };
  } catch (error) {
    console.error("[office] failed to change role", error);
    return generic;
  }
}

/* ---------- Contact messages ---------- */

export type MessagesResult = { ok: true; messages: ContactMessage[]; source: DataSource } | OfficeFailure;

export async function listOfficeMessages(): Promise<MessagesResult> {
  if (!(await requireStaff())) return unauthorized;
  try {
    const masked = site.demo.enabled;
    const messages = (await listContactMessages()).map((m) => (masked ? { ...m, phone: maskPhone(m.phone) } : m));
    return { ok: true, messages, source: source() };
  } catch (error) {
    console.error("[office] failed to list messages", error);
    return generic;
  }
}

export async function setOfficeMessageHandled(id: string, handled: boolean): Promise<{ ok: true } | OfficeFailure> {
  if (!(await requireStaff())) return unauthorized;
  if (typeof id !== "string" || typeof handled !== "boolean") return { ok: false, error: "notFound" };
  try {
    return (await setMessageHandled(id, handled)) ? { ok: true } : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("[office] failed to update message", error);
    return generic;
  }
}
