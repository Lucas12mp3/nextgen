import { collection, doc, limit, onSnapshot, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
export const privacyKinds = { acesso: "Consultar meus dados", correcao: "Corrigir informações", exclusao: "Solicitar exclusão", ajuda: "Ajuda com privacidade" };
export type PrivacyRequest = { id: string; userId: string; generation: string; kind: keyof typeof privacyKinds; message: string; status: "pending" | "reviewed" | "resolved"; response: string; reviewedBy: string; createdAt?: { toMillis(): number }; updatedAt?: { toMillis(): number } };
export function subscribeOwnPrivacyRequest(userId: string, update: (request: PrivacyRequest | null) => void, error: (e: Error) => void) {
  return onSnapshot(doc(db, "privacyRequests", userId), snap => update(snap.exists() ? { ...snap.data(), id: snap.id } as PrivacyRequest : null), error);
}
export async function sendPrivacyRequest(kind: keyof typeof privacyKinds, message: string) {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Entre na sua conta para enviar uma solicitação.");
  if (!Object.hasOwn(privacyKinds, kind) || message.trim().length < 10 || message.trim().length > 2000) throw new Error("Descreva a solicitação com 10 a 2000 caracteres.");
  const ref = doc(db, "privacyRequests", userId);
  const generation = crypto.randomUUID();
  await runTransaction(db, async tx => {
    const old = await tx.get(ref);
    if (old.exists() && old.get("status") !== "resolved") throw new Error("Você já tem uma solicitação em andamento. Acompanhe a resposta nesta página.");
    tx.set(ref, { userId, generation, kind, message: message.trim(), status: "pending", response: "", reviewedBy: "", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
}
export function subscribePrivacyRequests(update: (items: PrivacyRequest[]) => void, error: (e: Error) => void) {
  return onSnapshot(query(collection(db, "privacyRequests"), where("status", "in", ["pending", "reviewed"]), limit(50)), snap => update(snap.docs.map(d => ({ ...d.data(), id: d.id } as PrivacyRequest)).sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0))), error);
}
export async function answerPrivacyRequest(id: string, generation: string, response: string, status: "reviewed" | "resolved") {
  const current = auth.currentUser?.uid;
  if (!current || !id || id.includes("/")) throw new Error("Sessão inválida.");
  if (!response.trim() || response.trim().length > 2000) throw new Error("Informe uma resposta de até 2000 caracteres.");
  const ref = doc(db, "privacyRequests", id);
  await runTransaction(db, async tx => {
    const old = await tx.get(ref);
    if (!old.exists() || old.get("status") === "resolved" || old.get("generation") !== generation) throw new Error("Esta solicitação mudou ou já foi concluída. Atualize a lista antes de responder.");
    tx.update(ref, { response: response.trim(), status, reviewedBy: current, updatedAt: serverTimestamp() });
  });
}
