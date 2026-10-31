export type ChatProfile = { uid: string; nome: string; tipoConta: string; companyStatus?: string; instituicao?: string };
export type ChatStatus = "pending" | "accepted" | "declined";
export type ChatTime = { toMillis(): number } | null;
export type Conversation = {
  id: string; members: string[]; createdBy: string; status: ChatStatus; intro: string;
  blockedBy: string[]; readAt: Record<string, ChatTime>; createdAt: ChatTime; updatedAt: ChatTime;
  lastMessageId: string; lastMessage: string; lastSenderId: string;
};
export type ChatMessage = { id: string; senderId: string; text: string; createdAt: ChatTime };

export function conversationId(a: string, b: string) {
  for (const uid of [a, b]) if (!uid || uid.length > 128 || /[|/]/.test(uid)) throw new Error("Conta inválida.");
  if (a === b) throw new Error("Escolha outra pessoa para conversar.");
  return [a, b].sort().join("|");
}
export function canContact(a: ChatProfile, b: ChatProfile) {
  const eligible = (p: ChatProfile) => p.tipoConta === "estudante" || (p.tipoConta === "empresa" && p.companyStatus === "verified");
  return a.uid !== b.uid && eligible(a) && eligible(b) && (a.tipoConta === "estudante" || b.tipoConta === "estudante");
}
export function chatText(value: string, max = 2000) {
  const text = value.trim();
  if (!text || text.length > max) throw new Error(`Escreva uma mensagem de 1 a ${max} caracteres.`);
  return text;
}
export function canSend(chat: Conversation, uid: string) {
  return chat.members.includes(uid) && chat.status === "accepted" && chat.blockedBy.length === 0;
}
export function isUnread(chat: Conversation, uid: string) {
  return chat.members.includes(uid) && chat.lastSenderId !== uid && chat.blockedBy.length === 0
    && (chat.updatedAt?.toMillis() ?? 0) > (chat.readAt[uid]?.toMillis() ?? 0);
}
