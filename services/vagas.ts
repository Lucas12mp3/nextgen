import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions, auth } from "@/firebase/config";
export type VagaStatus = "aberta" | "fechada";
export type Vaga = { id: string; empresaId: string; empresaNome: string; titulo: string; descricao: string; requisitos: string; modalidade: string; local: string; status: VagaStatus; createdAt?: unknown };
function sortedVagas(items: Vaga[]) {
  const seconds = (v: Vaga) => (v.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
  return items.sort((a, b) => seconds(b) - seconds(a) || a.id.localeCompare(b.id));
}
export async function criarVaga(payload: Omit<Vaga, "id"> & { createdAt?: unknown }) {
  if (!auth.currentUser || auth.currentUser.uid !== payload.empresaId) throw new Error("Sessão inválida.");
  const result = await httpsCallable(functions, "createVacancy")({ titulo: payload.titulo, descricao: payload.descricao, requisitos: payload.requisitos, modalidade: payload.modalidade, local: payload.local });
  return (result.data as { id: string }).id;
}
export function subscribeVagas(onUpdate: (items: Vaga[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(query(collection(db, "vagas"), where("status", "==", "aberta")), (snap) => onUpdate(sortedVagas(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Vaga[])), onError);
}
export function subscribeVagasEmpresa(empresaId: string, onUpdate: (items: Vaga[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(query(collection(db, "vagas"), where("empresaId", "==", empresaId)), (snap) => onUpdate(sortedVagas(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Vaga[])), onError);
}
export async function fecharVaga(vagaId: string) { await updateDoc(doc(db, "vagas", vagaId), { status: "fechada" }); }
