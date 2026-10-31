import "server-only";
import { createPrivateKey } from "node:crypto";

export type ChallengeConfigReason = "ready" | "missing-credentials" | "invalid-json" | "missing-project" | "project-mismatch" | "invalid-email" | "invalid-private-key";
type Credentials = { projectId: string; clientEmail: string; privateKey: string };
export function resolveChallengeConfig(env: Record<string, string | undefined>): { available: boolean; reason: ChallengeConfigReason; credentials: Credentials | null } {
  const fail = (reason: ChallengeConfigReason) => ({ available: false, reason, credentials: null });
  let account: Record<string, unknown> | null = null;
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) {
    try {
      let parsed: unknown = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON.trim());
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail("invalid-json");
      account = parsed as Record<string, unknown>;
    } catch { return fail("invalid-json"); }
  }
  const value = (input: unknown) => typeof input === "string" ? input.trim() : "";
  const accountProject = value(account?.project_id ?? account?.projectId);
  const projectId = value(env.FIREBASE_PROJECT_ID) || accountProject || value(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  const clientEmail = value(account ? account.client_email ?? account.clientEmail : env.FIREBASE_CLIENT_EMAIL);
  let privateKey = value(account ? account.private_key ?? account.privateKey : env.FIREBASE_PRIVATE_KEY);
  if (!clientEmail || !privateKey) return fail("missing-credentials");
  if (!projectId) return fail("missing-project");
  if ((accountProject && accountProject !== projectId) || (env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && projectId !== value(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID))) return fail("project-mismatch");
  if (!/^[^@\s]+@[^@\s]+\.gserviceaccount\.com$/.test(clientEmail)) return fail("invalid-email");
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    try { privateKey = String(JSON.parse(privateKey)); } catch { return fail("invalid-private-key"); }
  }
  privateKey = privateKey.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
  try {
    const key = createPrivateKey(privateKey);
    if (key.asymmetricKeyType !== "rsa" || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) return fail("invalid-private-key");
  } catch { return fail("invalid-private-key"); }
  return { available: true, reason: "ready", credentials: { projectId, clientEmail, privateKey } };
}
