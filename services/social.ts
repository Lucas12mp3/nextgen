import { collection, deleteDoc, doc, onSnapshot, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { canContact, conversationId, DEFAULT_CHAT_PREFERENCES, type ChatPreferences, type ChatPresence, type Friendship } from "./chat-policy";

function uid() {
  if (!auth.currentUser) throw new Error("Entre na sua conta para continuar.");
  return auth.currentUser.uid;
}
export function subscribeChatStatus(userId: string, update: (status: ChatPresence | null) => void, error: (error: Error) => void) {
  return onSnapshot(doc(db, "chatStatus", userId), snap => update(snap.exists() ? snap.data() as ChatPresence : null), error);
}
export async function saveChatPreferences(preferences: ChatPreferences) {
  const ref = doc(db, "chatStatus", uid());
  await runTransaction(db, async tx => {
    const old = await tx.get(ref);
    tx.set(ref, { ...preferences, lastActiveAt: preferences.showOnline ? old.get("lastActiveAt") ?? null : null });
  });
}
export async function heartbeat() {
  const ref = doc(db, "chatStatus", uid());
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const preferences = snap.exists() ? snap.data() as ChatPresence : DEFAULT_CHAT_PREFERENCES;
    if (!preferences.showOnline) return;
    tx.set(ref, { showOnline: true, readReceipts: preferences.readReceipts, lastActiveAt: serverTimestamp() });
  });
}
export function subscribeFriendships(userId: string, update: (friends: Friendship[]) => void, error: (error: Error) => void) {
  return onSnapshot(query(collection(db, "friendships"), where("members", "array-contains", userId)), snap => {
    update(snap.docs.map(d => ({ id: d.id, ...d.data() } as Friendship))
      .sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0)));
  }, error);
}
export async function requestFriendship(otherUid: string) {
  const current = uid(), id = conversationId(current, otherUid), ref = doc(db, "friendships", id);
  await runTransaction(db, async tx => {
    const [existing, a, b] = await Promise.all([tx.get(ref), tx.get(doc(db, "users", current)), tx.get(doc(db, "users", otherUid))]);
    if (existing.exists()) throw new Error(existing.get("status") === "accepted" ? "Vocês já são amigos." : "Já existe um pedido entre vocês. Confira a aba Amigos.");
    if (!canContact({ uid: current, ...a.data() } as Parameters<typeof canContact>[0], { uid: otherUid, ...b.data() } as Parameters<typeof canContact>[1])) {
      throw new Error("Este contato não está disponível para amizade.");
    }
    tx.set(ref, { members: [current, otherUid].sort(), requestedBy: current, status: "pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
}
export async function answerFriendship(id: string, accept: boolean) {
  const current = uid(), ref = doc(db, "friendships", id);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists() || !snap.get("members").includes(current) || snap.get("requestedBy") === current || snap.get("status") !== "pending") {
      throw new Error("Este pedido não está mais disponível.");
    }
    tx.update(ref, { status: accept ? "accepted" : "declined", updatedAt: serverTimestamp() });
  });
}
export async function removeFriendship(id: string) {
  uid();
  await deleteDoc(doc(db, "friendships", id));
}
