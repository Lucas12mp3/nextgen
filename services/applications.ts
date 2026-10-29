import { collection, doc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/firebase/config";

export type ApplicationData = { fromUserId: string; fromUserName?: string; toCompanyId?: string; toCompanyName?: string; vagaId?: string; role?: string; message?: string; status?: "pending" | "reviewed" | "rejected" | "hired"; createdAt?: unknown; read?: boolean };
export type ApplicationRecord = ApplicationData & { id: string };
export async function sendApplication(payload: ApplicationData) {
  if (!auth.currentUser || auth.currentUser.uid !== payload.fromUserId) throw new Error("Faça login como estudante para se candidatar.");
  const result = await httpsCallable(functions, "submitApplication")({ vagaId: payload.vagaId, message: payload.message });
  return (result.data as { id: string }).id;
}
export function subscribeCompanyApplications(companyUid: string, onUpdate: (items: ApplicationRecord[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(query(collection(db, "applications"), where("toCompanyId", "==", companyUid)), (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ApplicationRecord[]), onError);
}
export async function hasUserAppliedToVaga(userId: string, vagaId: string) {
  const snap = await getDocs(query(collection(db, "applications"), where("fromUserId", "==", userId), where("vagaId", "==", vagaId)));
  return !snap.empty;
}
export async function markApplicationRead(applicationId: string) { await updateDoc(doc(db, "applications", applicationId), { read: true }); }
export async function updateApplicationStatus(applicationId: string, status: ApplicationData["status"]) { await updateDoc(doc(db, "applications", applicationId), { status, read: true }); }
