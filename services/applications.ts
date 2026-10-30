import { collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { auth, db } from "@/firebase/config";

export type ApplicationData = { fromUserId: string; fromUserName?: string; toCompanyId?: string; toCompanyName?: string; vagaId?: string; role?: string; message?: string; status?: "pending" | "reviewed" | "rejected" | "hired"; createdAt?: unknown; read?: boolean };
export type ApplicationRecord = ApplicationData & { id: string };
export async function sendApplication(payload: ApplicationData) {
  if (!auth.currentUser || auth.currentUser.uid !== payload.fromUserId) throw new Error("Faça login como estudante para se candidatar.");
  if (!payload.vagaId || payload.vagaId.includes("/")) throw new Error("Vaga inválida.");
  const uid = auth.currentUser.uid;
  const application = doc(db, "applications", `${uid}_${payload.vagaId}`);
  await runTransaction(db, async tx => {
    const student = await tx.get(doc(db, "users", uid));
    const vacancy = await tx.get(doc(db, "vagas", payload.vagaId!));
    if (student.get("tipoConta") !== "estudante") throw new Error("Somente estudantes podem se candidatar.");
    if (!vacancy.exists() || vacancy.get("status") !== "aberta") throw new Error("Esta vaga não está mais disponível.");
    const companyId = vacancy.get("empresaId");
    const company = await tx.get(doc(db, "users", companyId));
    if (company.get("companyStatus") !== "verified") throw new Error("A empresa ainda não foi aprovada.");
    tx.set(application, { fromUserId: uid, fromUserName: student.get("nome") || "Estudante", toCompanyId: companyId,
      toCompanyName: vacancy.get("empresaNome") || company.get("nome") || "Empresa", vagaId: vacancy.id,
      role: vacancy.get("titulo"), message: (payload.message || "Tenho interesse nesta vaga.").trim(),
      status: "pending", read: false, createdAt: serverTimestamp() });
    tx.set(doc(db, "resumeAccess", uid, "companies", companyId), { applicationId: application.id, grantedAt: serverTimestamp() });
  });
  return application.id;
}
export function subscribeCompanyApplications(companyUid: string, onUpdate: (items: ApplicationRecord[]) => void, onError?: (error: Error) => void) {
  let active = true, version = 0;
  const stop = onSnapshot(query(collection(db, "applications"), where("toCompanyId", "==", companyUid)), async snap => {
    const current = ++version;
    const items = await Promise.all(snap.docs.map(async d => {
      const item = { id: d.id, ...d.data() } as ApplicationRecord;
      if (!item.fromUserName && item.fromUserId) {
        try { item.fromUserName = (await getDoc(doc(db, "users", item.fromUserId))).get("nome") || "Estudante"; }
        catch { item.fromUserName = "Estudante"; }
      }
      return item;
    }));
    if (active && current === version) onUpdate(items);
  }, onError);
  return () => { active = false; stop(); };
}
export function subscribeStudentApplications(uid: string, onUpdate: (items: ApplicationRecord[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(query(collection(db, "applications"), where("fromUserId", "==", uid)), snap => onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ApplicationRecord[]), onError);
}
export async function hasUserAppliedToVaga(userId: string, vagaId: string) {
  const snap = await getDocs(query(collection(db, "applications"), where("fromUserId", "==", userId), where("vagaId", "==", vagaId)));
  return !snap.empty;
}
export async function markApplicationRead(applicationId: string) { await updateDoc(doc(db, "applications", applicationId), { read: true }); }
export async function updateApplicationStatus(applicationId: string, status: ApplicationData["status"]) { await updateDoc(doc(db, "applications", applicationId), { status, read: true }); }
