import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/firebase/config";

export type ApplicationData = {
  fromUserId: string;
  fromUserName?: string;
  toCompanyId: string;
  toCompanyName?: string;
  vagaId?: string;
  role?: string;
  message?: string;
  status?: "pending" | "reviewed" | "rejected" | "hired";
  createdAt?: unknown;
  read?: boolean;
};

export type ApplicationRecord = ApplicationData & { id: string };

export async function sendApplication(payload: ApplicationData) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Você precisa estar autenticado para se candidatar.");
  }

  if (currentUser.uid !== payload.fromUserId) {
    throw new Error("A candidatura deve ser enviada pela conta do usuário atual.");
  }

  const ref = await addDoc(collection(db, "applications"), {
    ...payload,
    fromUserName: payload.fromUserName ?? currentUser.displayName ?? currentUser.email ?? "Candidato",
    status: payload.status ?? "pending",
    createdAt: serverTimestamp(),
    read: false,
  });
  return ref.id;
}

export function subscribeCompanyApplications(companyUid: string, onUpdate: (items: ApplicationRecord[]) => void) {
  const q = query(collection(db, "applications"), where("toCompanyId", "==", companyUid));
  return onSnapshot(q, (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as ApplicationRecord[]));
}

export async function hasUserAppliedToVaga(userId: string, vagaId: string) {
  const q = query(collection(db, "applications"), where("fromUserId", "==", userId), where("vagaId", "==", vagaId));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function markApplicationRead(applicationId: string) {
  const ref = doc(db, "applications", applicationId);
  await updateDoc(ref, { read: true });
}

export async function updateApplicationStatus(applicationId: string, status: ApplicationData["status"]) {
  const ref = doc(db, "applications", applicationId);
  await updateDoc(ref, { status, read: true });
}
