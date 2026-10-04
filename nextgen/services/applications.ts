import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";

export type ApplicationData = {
  fromUserId: string;
  fromUserName?: string;
  toCompanyId: string;
  toCompanyName?: string;
  role?: string;
  message?: string;
  status?: "pending" | "reviewed" | "rejected" | "hired";
  createdAt?: any;
  read?: boolean;
};

export async function sendApplication(payload: ApplicationData) {
  const ref = await addDoc(collection(db, "applications"), {
    ...payload,
    status: payload.status ?? "pending",
    createdAt: serverTimestamp(),
    read: false,
  });
  return ref.id;
}

export function subscribeCompanyApplications(companyUid: string, onUpdate: (items: any[]) => void) {
  const q = query(collection(db, "applications"), where("toCompanyId", "==", companyUid));
  return onSnapshot(q, (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
}
