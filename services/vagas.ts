import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db, auth } from "@/firebase/config";
export type VagaStatus = "aberta" | "fechada";
export type Vaga = { id: string; empresaId: string; empresaNome: string; titulo: string; descricao: string; requisitos: string; modalidade: string; local: string; status: VagaStatus; createdAt?: unknown };
function sortedVagas(items: Vaga[]) {
  const seconds = (v: Vaga) => (v.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
  return items.sort((a, b) => seconds(b) - seconds(a) || a.id.localeCompare(b.id));
}
export async function criarVaga(payload: Omit<Vaga, "id"> & { createdAt?: unknown }) {
  if (!auth.currentUser || auth.currentUser.uid !== payload.empresaId) throw new Error("Sessão inválida.");
  const company = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (company.get("tipoConta") !== "empresa" || company.get("companyStatus") !== "verified") throw new Error("Sua empresa precisa de aprovação para publicar vagas.");
  const text = (value: string, max: number) => {
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error("Preencha os campos da vaga dentro dos limites indicados.");
    return value.trim();
  };
  if (!["Presencial", "Híbrido", "Remoto"].includes(payload.modalidade)) throw new Error("Selecione uma modalidade válida.");
  const result = await addDoc(collection(db, "vagas"), { empresaId: auth.currentUser.uid, empresaNome: company.get("nome"),
    titulo: text(payload.titulo, 160), descricao: text(payload.descricao, 5000), requisitos: text(payload.requisitos, 3000),
    modalidade: payload.modalidade, local: text(payload.local, 200), status: "aberta", createdAt: serverTimestamp() });
  return result.id;
}
export function subscribeVagas(onUpdate: (items: Vaga[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(query(collection(db, "vagas"), where("status", "==", "aberta")), (snap) => onUpdate(sortedVagas(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Vaga[])), onError);
}
export function subscribeVagasEmpresa(empresaId: string, onUpdate: (items: Vaga[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(query(collection(db, "vagas"), where("empresaId", "==", empresaId)), (snap) => onUpdate(sortedVagas(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Vaga[])), onError);
}
export async function fecharVaga(vagaId: string) { await updateDoc(doc(db, "vagas", vagaId), { status: "fechada" }); }
