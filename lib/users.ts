import "server-only";
import { randomBytes } from "node:crypto";
import { site } from "@/config/site";
import { demoParentRefs } from "./admissions";
import { demoAccounts } from "./demo-accounts";
import { hashPassword } from "./passwords";
import { dhakaTimestamp } from "./ref";
import type { Role } from "./session-token";
import { appendRow, readRange, sheetsConfigured, updateRange } from "./sheets";
import { demoParentTrialRef } from "./trials";
import { normalizePhone } from "./validation";

/*
 * Accounts. Same storage rules as admissions: the "Users" tab of the private
 * Sheet when configured, memory in local dev, plus the two demo accounts in
 * demo mode (memory only, never written to the Sheet).
 */

export type Provider = "google" | "facebook";

export type User = {
  id: string;
  createdAt: number;
  name: string;
  /** Lower-case, or "". */
  email: string;
  /** Only true when Google/Facebook vouched for it; typed-in emails are unverified. */
  emailVerified: boolean;
  /** "01XXXXXXXXX", or "". */
  phone: string;
  passwordHash: string;
  role: Role;
  googleId: string;
  facebookId: string;
  /** ALO-… admission and TRL-… trial references this account can see. */
  linkedRefs: string[];
  lastLogin: number;
  demo?: boolean;
};

// Columns: Created | User ID | Name | Email | Phone | Password Hash | Role | Google ID |
// Facebook ID | Linked Refs | Last Login | Email Verified
const TAB = "Users";
const MAX_LINKED = 50;

const stamp = (ms: number) => (ms ? dhakaTimestamp(new Date(ms)) : "");

function toRow(u: User) {
  return [
    stamp(u.createdAt),
    u.id,
    u.name,
    u.email,
    u.phone,
    u.passwordHash,
    u.role,
    u.googleId,
    u.facebookId,
    u.linkedRefs.join(" "),
    stamp(u.lastLogin),
    u.emailVerified ? "yes" : "",
  ];
}

function parseStamp(value: string) {
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})/);
  return m ? Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]) - 6, Number(m[5])) : 0;
}

function fromRow(cells: string[]): User {
  const cell = (i: number) => (cells[i] ?? "").trim();
  return {
    createdAt: parseStamp(cell(0)),
    id: cell(1),
    name: cell(2),
    email: cell(3).toLowerCase(),
    phone: normalizePhone(cell(4)),
    passwordHash: cell(5),
    // Anything other than an exact "staff" (case-insensitive) is a parent account.
    role: cell(6).toLowerCase() === "staff" ? "staff" : "parent",
    googleId: cell(7),
    facebookId: cell(8),
    linkedRefs: cell(9).split(/[\s,]+/).filter(Boolean),
    lastLogin: parseStamp(cell(10)),
    emailVerified: cell(11).toLowerCase() === "yes",
  };
}

const memory = globalThis as typeof globalThis & {
  __aloUsers?: User[];
  __aloDemoUsers?: Promise<Map<string, User>>;
  __aloUserCache?: { at: number; users: User[] };
};
const localRows = () => (memory.__aloUsers ??= []);

// Sheet reads are cached briefly: the office polls, and every poll checks the user's role.
const CACHE_MS = 10_000;

async function storedUsers(): Promise<User[]> {
  if (!sheetsConfigured()) return localRows();
  const cached = memory.__aloUserCache;
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.users;
  const users = (await readRange(`${TAB}!A2:L`)).filter((cells) => cells[1]).map(fromRow);
  memory.__aloUserCache = { at: Date.now(), users };
  return users;
}

function demoUsers(): Promise<Map<string, User>> {
  memory.__aloDemoUsers ??= (async () => {
    const { parent, staff } = demoAccounts;
    const base = { createdAt: Date.now(), googleId: "", facebookId: "", lastLogin: 0, demo: true, linkedRefs: [] };
    return new Map<string, User>([
      [
        parent.userId,
        {
          ...base,
          id: parent.userId,
          name: parent.name,
          email: "",
          emailVerified: false,
          phone: parent.login,
          passwordHash: await hashPassword(parent.password),
          role: "parent",
        },
      ],
      [
        staff.userId,
        {
          ...base,
          id: staff.userId,
          name: staff.name,
          email: staff.login,
          emailVerified: true,
          phone: "",
          passwordHash: await hashPassword(staff.password),
          role: "staff",
        },
      ],
    ]);
  })();
  return memory.__aloDemoUsers;
}

/** The demo parent always sees the current sample references (they include today's date). */
function withDemoRefs(user: User): User {
  if (user.id !== demoAccounts.parent.userId) return user;
  const samples = [...demoParentRefs(), demoParentTrialRef()].filter((r): r is string => Boolean(r));
  return { ...user, linkedRefs: [...new Set([...samples, ...user.linkedRefs])] };
}

async function allUsers(): Promise<User[]> {
  const stored = await storedUsers();
  const demo = site.demo.enabled ? [...(await demoUsers()).values()].map(withDemoRefs) : [];
  return [...demo, ...stored];
}

/** Every account (demo accounts first in demo mode), for the office's users page. */
export async function listUsers() {
  return allUsers();
}

export async function findUserById(id: string) {
  return (await allUsers()).find((u) => u.id === id);
}

/** By "phone or email", as typed on the login form. */
export async function findUserByLogin(login: string) {
  const value = login.trim();
  if (value.includes("@")) {
    const email = value.toLowerCase();
    return (await allUsers()).find((u) => u.email === email);
  }
  const phone = normalizePhone(value);
  return phone ? (await allUsers()).find((u) => u.phone === phone) : undefined;
}

export async function findUserByEmail(email: string) {
  const value = email.trim().toLowerCase();
  return value ? (await allUsers()).find((u) => u.email === value) : undefined;
}

export async function findUserByPhone(phone: string) {
  const value = normalizePhone(phone);
  return value ? (await allUsers()).find((u) => u.phone === value) : undefined;
}

export async function findUserByProvider(provider: Provider, providerId: string) {
  const key = provider === "google" ? "googleId" : "facebookId";
  return providerId ? (await allUsers()).find((u) => u[key] === providerId) : undefined;
}

export async function createUser(data: Omit<User, "id" | "createdAt" | "lastLogin" | "linkedRefs">): Promise<User> {
  const user: User = {
    ...data,
    id: `U${randomBytes(6).toString("hex").toUpperCase()}`,
    createdAt: Date.now(),
    lastLogin: Date.now(),
    linkedRefs: [],
  };
  if (sheetsConfigured()) {
    await appendRow(TAB, toRow(user));
    memory.__aloUserCache = undefined;
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("Google Sheets is not configured");
  } else {
    console.info("[users] Sheets not configured — kept in memory:", user.id, user.name);
    localRows().push(user);
  }
  return user;
}

/**
 * Changes one account and returns it. `change` receives the account as stored
 * right now (read fresh, not from the cache), so an edit made meanwhile in the
 * Sheet or by another server, such as a role change, isn't overwritten.
 */
export async function updateUser(id: string, change: (user: User) => User): Promise<User> {
  const demo = site.demo.enabled ? await demoUsers() : null;
  const demoUser = demo?.get(id);
  if (demo && demoUser) {
    const updated = change(withDemoRefs(demoUser));
    // Sample refs are added on every read, so don't store them.
    const samples = new Set([...demoParentRefs(), demoParentTrialRef()]);
    demo.set(id, { ...updated, linkedRefs: updated.linkedRefs.filter((r) => !samples.has(r)) });
    return updated;
  }
  if (!sheetsConfigured()) {
    const rows = localRows();
    const index = rows.findIndex((u) => u.id === id);
    if (index === -1) throw new Error(`User ${id} not found`);
    rows[index] = change(rows[index]);
    return rows[index];
  }
  // Find the row fresh, so rows added meanwhile can't shift the target.
  const rows = await readRange(`${TAB}!A2:L`);
  const index = rows.findIndex((cells) => cells[1]?.trim() === id);
  if (index === -1) throw new Error(`User ${id} not found in the Sheet`);
  const updated = change(fromRow(rows[index]));
  const row = index + 2;
  await updateRange(`${TAB}!A${row}:L${row}`, [toRow(updated)]);
  memory.__aloUserCache = undefined;
  return updated;
}

/** Adds references to an account (newest first, no duplicates). */
export async function linkRefs(user: User, refs: string[]) {
  if (refs.every((r) => user.linkedRefs.includes(r))) return user;
  return updateUser(user.id, (u) => ({ ...u, linkedRefs: [...new Set([...refs, ...u.linkedRefs])].slice(0, MAX_LINKED) }));
}

/** STAFF_EMAILS: comma-separated emails that become staff when Google/Facebook verify them. */
export function isStaffEmail(email: string) {
  return (process.env.STAFF_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}
