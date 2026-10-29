import { HttpsError } from "firebase-functions/v2/https";

export function parseAdminInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpsError("invalid-argument", "Dados inválidos.");
  return value as Record<string, unknown>;
}
export function adminId(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > 128 || value.includes("/") || value === "." || value === "..") throw new HttpsError("invalid-argument", `Identificador inválido: ${name}.`);
  return value;
}
export function moderationReason(value: unknown): string {
  if (typeof value !== "string" || value.trim().length < 10 || value.trim().length > 1000) throw new HttpsError("invalid-argument", "Informe um motivo entre 10 e 1000 caracteres.");
  return value.trim();
}
export function authorizationStatus(value: unknown): "verified" | "rejected" | "pending" {
  if (value !== "verified" && value !== "rejected" && value !== "pending") throw new HttpsError("invalid-argument", "Situação inválida.");
  return value;
}
export function remainingCommentCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value) - 1) : 0;
}
export async function authorizeAdmin(uid: string | undefined, hasAdminRecord: (uid: string) => Promise<boolean>): Promise<string> {
  if (!uid) throw new HttpsError("unauthenticated", "Entre na sua conta.");
  if (!await hasAdminRecord(uid)) throw new HttpsError("permission-denied", "Acesso exclusivo para administradores.");
  return uid;
}
