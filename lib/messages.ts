import { getMessages } from "next-intl/server";
import type { Messages } from "next-intl";

/** Picks only the namespaces a client component needs, to keep page payloads small. */
export async function pickMessages<K extends keyof Messages>(namespaces: readonly K[]) {
  const messages = await getMessages();
  return Object.fromEntries(namespaces.map((ns) => [ns, messages[ns]])) as Pick<Messages, K>;
}
