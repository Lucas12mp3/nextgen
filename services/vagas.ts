import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/config";

export type VagaStatus = "aberta" | "fechada";

export type Vaga = {
  id: string;
  empresaId: string;
  empresaNome: string;
  titulo: string;
  descricao: string;
  requisitos: string;
  modalidade: string;
  local: string;
  status: VagaStatus;
  createdAt?: unknown;
};

export async function criarVaga(payload: Omit<Vaga, "id"> & { createdAt?: unknown }) {
  const ref = await addDoc(collection(db, "vagas"), {
    ...payload,
    status: payload.status ?? "aberta",
    createdAt: payload.createdAt ?? serverTimestamp(),
  });

  return ref.id;
}

export function subscribeVagas(onUpdate: (items: Vaga[]) => void) {
  const q = query(collection(db, "vagas"), where("status", "==", "aberta"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Vaga[];
    onUpdate(items);
  });
}

export function subscribeVagasEmpresa(empresaId: string, onUpdate: (items: Vaga[]) => void) {
  const q = query(collection(db, "vagas"), where("empresaId", "==", empresaId), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Vaga[];
    onUpdate(items);
  });
}

export async function fecharVaga(vagaId: string) {
  const ref = doc(db, "vagas", vagaId);
  await updateDoc(ref, { status: "fechada" });
}
