import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/firebase/config";
export type ProposalData = { fromCompanyId: string; fromCompanyName: string; toUserId: string; role: string; message: string; requirements?: string; status?: "pending" | "accepted" | "rejected"; createdAt?: unknown };
export type ProposalRecord = ProposalData & { id: string; read?: boolean };
export async function sendProposal(payload: ProposalData) {
  if (!auth.currentUser || auth.currentUser.uid !== payload.fromCompanyId) throw new Error("Sessão inválida.");
  const result = await httpsCallable(functions, "sendProposal")({ toUserId: payload.toUserId, role: payload.role, message: payload.message, requirements: payload.requirements });
  return (result.data as { id: string }).id;
}
export function subscribeUserProposals(uid: string, onUpdate: (items: ProposalRecord[]) => void) {
  return onSnapshot(query(collection(db, "proposals"), where("toUserId", "==", uid)), (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProposalRecord[]));
}
export async function markProposalRead(proposalId: string) { await updateDoc(doc(db, "proposals", proposalId), { read: true }); }
export async function respondProposal(proposalId: string, uid: string, accept: boolean) {
  const ref = doc(db, "proposals", proposalId); const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().toUserId !== uid) throw new Error("Não autorizado.");
  await updateDoc(ref, { status: accept ? "accepted" : "rejected", read: true });
}
