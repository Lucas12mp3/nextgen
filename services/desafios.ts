import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/config";

export type Pergunta = {
  enunciado: string;
  opcoes: string[];
  correta: number;
};

export type DesafioNivel = "iniciante" | "intermediario" | "avancado";

export type Desafio = {
  id: string;
  empresaId: string;
  empresaNome: string;
  titulo: string;
  descricao: string;
  area: string;
  nivel: DesafioNivel;
  notaMinima: number;
  perguntas: Pergunta[];
  status: "aberto" | "fechado";
  createdAt?: unknown;
};

export type Conquista = {
  id: string;
  userId: string;
  desafioId: string;
  desafioTitulo: string;
  empresaNome: string;
  nivel: DesafioNivel;
  nota: number;
  createdAt?: unknown;
};

export async function criarDesafio(payload: Omit<Desafio, "id" | "status" | "createdAt"> & { createdAt?: unknown }) {
  const ref = await addDoc(collection(db, "desafios"), {
    ...payload,
    status: "aberto",
    createdAt: payload.createdAt ?? serverTimestamp(),
  });

  return ref.id;
}

export function subscribeDesafiosAbertos(onUpdate: (items: Desafio[]) => void) {
  const q = query(collection(db, "desafios"), where("status", "==", "aberto"));

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Desafio[];

    items.sort((a, b) => {
      const aTime = (a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
      const bTime = (b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
      return bTime - aTime;
    });

    onUpdate(items);
  });
}

export function subscribeDesafiosEmpresa(empresaId: string, onUpdate: (items: Desafio[]) => void) {
  const q = query(collection(db, "desafios"), where("empresaId", "==", empresaId));

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Desafio[];

    items.sort((a, b) => {
      const aTime = (a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
      const bTime = (b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
      return bTime - aTime;
    });

    onUpdate(items);
  });
}

export async function getDesafio(id: string) {
  const ref = doc(db, "desafios", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Record<string, unknown>) } as Desafio;
}

export async function fecharDesafio(id: string) {
  const ref = doc(db, "desafios", id);
  await updateDoc(ref, { status: "fechado" });
}

export function calcularNota(perguntas: Pergunta[], respostas: number[]) {
  if (!perguntas.length) return 0;

  let acertos = 0;

  perguntas.forEach((pergunta, index) => {
    if (respostas[index] === pergunta.correta) {
      acertos += 1;
    }
  });

  return Math.round((acertos / perguntas.length) * 100);
}

export async function concluirDesafio(userId: string, desafio: Desafio, nota: number) {
  if (nota < desafio.notaMinima) return false;

  const conquistaId = `${userId}_${desafio.id}`;
  const conquistaRef = doc(db, "conquistas", conquistaId);

  await setDoc(conquistaRef, {
    userId,
    desafioId: desafio.id,
    desafioTitulo: desafio.titulo,
    empresaNome: desafio.empresaNome,
    nivel: desafio.nivel,
    nota,
    createdAt: serverTimestamp(),
  });

  return true;
}

export function subscribeConquistas(userId: string, onUpdate: (items: Conquista[]) => void) {
  const q = query(collection(db, "conquistas"), where("userId", "==", userId));

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Conquista[];

    items.sort((a, b) => {
      const aTime = (a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
      const bTime = (b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
      return bTime - aTime;
    });

    onUpdate(items);
  });
}
