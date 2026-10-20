import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";

export type ProposalData = {
  fromCompanyId: string;
  fromCompanyName: string;
  toUserId: string; // candidate uid
  role: string;
  message: string;
  requirements?: string;
  status?: "pending" | "accepted" | "rejected";
  createdAt?: unknown;
};

export type ProposalRecord = ProposalData & { id: string; read?: boolean };

export async function sendProposal(payload: ProposalData) {
  const ref = await addDoc(collection(db, "proposals"), {
    ...payload,
    status: payload.status ?? "pending",
    createdAt: serverTimestamp(),
    read: false,
  });
  // Optionally, you could write a lightweight notification doc or rely on proposals query in company UI
  return ref.id;
}

export function subscribeUserProposals(uid: string, onUpdate: (items: ProposalRecord[]) => void) {
  const q = query(collection(db, "proposals"), where("toUserId", "==", uid));
  return onSnapshot(q, (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as ProposalRecord[]));
}

export async function markProposalRead(proposalId: string) {
  const ref = doc(db, "proposals", proposalId);
  await updateDoc(ref, { read: true });
}

export async function respondProposal(proposalId: string, uid: string, accept: boolean) {
  const ref = doc(db, "proposals", proposalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Proposal not found");
  const data = snap.data() as Record<string, unknown>;
  if (data.toUserId !== uid) throw new Error("Not authorized");
  await updateDoc(ref, { status: accept ? "accepted" : "rejected", read: true });
}
