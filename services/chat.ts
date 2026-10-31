import {
  collection, doc, documentId, getDoc, getDocs, limit, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, startAfter, updateDoc, where, arrayUnion, arrayRemove,
  FieldPath, type QueryDocumentSnapshot, type DocumentData,
} from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { canContact, canSend, chatText, conversationId, type ChatProfile, type Conversation, type ChatMessage } from "./chat-policy";
export * from "./chat-policy";

function uid() {
  if (!auth.currentUser) throw new Error("Entre na sua conta para conversar.");
  return auth.currentUser.uid;
}
function safeId(value: string) {
  if (!value || value.includes("/") || value.length > 1000) throw new Error("Conversa inválida.");
  return value;
}
export async function getChatProfile(userId: string): Promise<ChatProfile> {
  const snap = await getDoc(doc(db, "users", safeId(userId)));
  if (!snap.exists()) throw new Error("Perfil não encontrado.");
  return { uid: snap.id, nome: String(snap.get("nome") || "Usuário"), tipoConta: String(snap.get("tipoConta") || ""),
    companyStatus: snap.get("companyStatus"), instituicao: snap.get("instituicao") };
}
export async function findPeople(cursor: string | null = null) {
  const snap = await getDocs(query(collection(db, "users"), orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(31)));
  const items = snap.docs.slice(0, 30).map(d => ({ uid: d.id, nome: String(d.get("nome") || "Usuário"),
    tipoConta: String(d.get("tipoConta") || ""), companyStatus: d.get("companyStatus"), instituicao: d.get("instituicao") } as ChatProfile));
  return { items, nextCursor: snap.size > 30 ? items[29].uid : null };
}
export function subscribeConversations(userId: string, onUpdate: (chats: Conversation[]) => void, onError: (error: Error) => void) {
  return onSnapshot(query(collection(db, "conversations"), where("members", "array-contains", userId)), snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
    onUpdate(items.sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0)));
  }, onError);
}
export async function requestConversation(otherUid: string, introduction: string) {
  const current = uid(), id = conversationId(current, otherUid);
  const intro = chatText(introduction, 500);
  const ref = doc(db, "conversations", id);
  await runTransaction(db, async tx => {
    const existing = await tx.get(ref);
    if (existing.exists()) return;
    const [self, other] = await Promise.all([getChatProfile(current), getChatProfile(otherUid)]);
    if (!canContact(self, other)) throw new Error("O contato é permitido entre estudantes e empresas aprovadas.");
    tx.set(ref, { members: [current, otherUid].sort(), createdBy: current, status: "pending", intro,
      blockedBy: [], readAt: { [current]: serverTimestamp(), [otherUid]: null },
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastMessageId: "", lastMessage: intro, lastSenderId: current });
  });
  return id;
}
export async function answerConversation(id: string, accept: boolean) {
  uid();
  await updateDoc(doc(db, "conversations", safeId(id)), { status: accept ? "accepted" : "declined" });
}
export async function setChatBlocked(id: string, blocked: boolean) {
  const current = uid();
  await updateDoc(doc(db, "conversations", safeId(id)), { blockedBy: blocked ? arrayUnion(current) : arrayRemove(current) });
}
export async function markChatRead(id: string) {
  const current = uid();
  await updateDoc(doc(db, "conversations", safeId(id)), new FieldPath("readAt", current), serverTimestamp());
}
export async function sendChatMessage(id: string, value: string, messageId: string) {
  const current = uid(), text = chatText(value);
  const ref = doc(db, "conversations", safeId(id)), message = doc(ref, "messages", safeId(messageId));
  await runTransaction(db, async tx => {
    const chat = await tx.get(ref);
    const existing = await tx.get(message);
    if (existing.exists()) {
      if (existing.get("senderId") !== current || existing.get("text") !== text) throw new Error("Envio inválido.");
      return;
    }
    if (!chat.exists() || !canSend({ id: chat.id, ...chat.data() } as Conversation, current)) throw new Error("Esta conversa não está disponível para enviar mensagens.");
    tx.set(message, { senderId: current, text, createdAt: serverTimestamp() });
    tx.update(ref, { lastMessageId: message.id, lastMessage: text, lastSenderId: current, updatedAt: serverTimestamp(), readAt: { ...chat.get("readAt"), [current]: serverTimestamp() } });
  });
}
export type MessageCursor = QueryDocumentSnapshot<DocumentData>;
export async function olderMessages(id: string, cursor: MessageCursor) {
  const snap = await getDocs(query(collection(db, "conversations", safeId(id), "messages"), orderBy("createdAt", "desc"), orderBy(documentId(), "desc"), startAfter(cursor), limit(50)));
  return { items: snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)), cursor: snap.docs.at(-1) ?? null, more: snap.size === 50 };
}
export function subscribeMessages(id: string, count: number, onUpdate: (items: ChatMessage[], oldest: MessageCursor | null, more: boolean) => void, onError: (error: Error) => void) {
  return onSnapshot(query(collection(db, "conversations", safeId(id), "messages"), orderBy("createdAt", "desc"), orderBy(documentId(), "desc"), limit(count)), snap => {
    onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)).reverse(), snap.docs.at(-1) ?? null, snap.size === count);
  }, onError);
}
export async function reportConversation(chat: Conversation, reason: string, evidence?: ChatMessage) {
  const reporterId = uid(), text = reason.trim(), reportedId = chat.members.find(member => member !== reporterId);
  if (!reportedId || text.length < 10 || text.length > 1000) throw new Error("Explique o ocorrido com 10 a 1000 caracteres.");
  const ref = doc(db, "chatReports", `${chat.id}_${reporterId}`);
  await runTransaction(db, async tx => {
    if ((await tx.get(ref)).exists()) throw new Error("Você já enviou uma denúncia desta conversa.");
    tx.set(ref, { conversationId: chat.id, reporterId, reportedId, reason: text, createdAt: serverTimestamp(), status: "open",
      messageId: evidence?.id || "", evidence: evidence?.text || "" });
  });
}
