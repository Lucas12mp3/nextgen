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

export const PONTOS_POR_NIVEL: Record<DesafioNivel, number> = {
  iniciante: 100,
  intermediario: 200,
  avancado: 350,
};

export type Desafio = {
  id: string;
  empresaId: string;
  empresaNome: string;
  titulo: string;
  descricao: string;
  area: string;
  nivel: DesafioNivel;
  notaMinima: number;
  pontos?: number;
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
  pontos?: number;
  createdAt?: unknown;
};

export type RankingItem = {
  userId: string;
  nome: string;
  instituicao: string;
  totalPontos: number;
  desafiosConcluidos: number;
  melhorNota: number;
};

export function calcularPontosDesafio(nivel: DesafioNivel, nota?: number) {
  const base = PONTOS_POR_NIVEL[nivel];
  if (typeof nota !== "number") return base;
  return Math.max(25, Math.round(base * (nota / 100)));
}

export async function criarDesafio(payload: Omit<Desafio, "id" | "status" | "createdAt"> & { createdAt?: unknown }) {
  const pontos = payload.pontos ?? PONTOS_POR_NIVEL[payload.nivel];

  const ref = await addDoc(collection(db, "desafios"), {
    ...payload,
    pontos,
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
  const pontosGanhos = calcularPontosDesafio(desafio.nivel, nota);

  await setDoc(conquistaRef, {
    userId,
    desafioId: desafio.id,
    desafioTitulo: desafio.titulo,
    empresaNome: desafio.empresaNome,
    nivel: desafio.nivel,
    nota,
    pontos: pontosGanhos,
    createdAt: serverTimestamp(),
  });

  return true;
}

export function subscribeRankingGeral(onUpdate: (items: RankingItem[]) => void) {
  return onSnapshot(collection(db, "conquistas"), async (snap) => {
    const acumulado = new Map<string, { totalPontos: number; desafiosConcluidos: number; melhorNota: number }>();

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      const userId = typeof data.userId === "string" ? data.userId : docSnap.id;
      const nota = typeof data.nota === "number" ? data.nota : 0;
      const pontos = typeof data.pontos === "number" ? data.pontos : calcularPontosDesafio(
        typeof data.nivel === "string" && data.nivel in PONTOS_POR_NIVEL
          ? (data.nivel as DesafioNivel)
          : "iniciante",
        nota,
      );

      const entry = acumulado.get(userId) ?? { totalPontos: 0, desafiosConcluidos: 0, melhorNota: 0 };
      entry.totalPontos += pontos;
      entry.desafiosConcluidos += 1;
      entry.melhorNota = Math.max(entry.melhorNota, nota);
      acumulado.set(userId, entry);
    });

    const ranking = await Promise.all(
      Array.from(acumulado.entries()).map(async ([userId, stats]) => {
        const userSnap = await getDoc(doc(db, "users", userId));
        const userData = userSnap.exists() ? (userSnap.data() as Record<string, unknown>) : {};

        return {
          userId,
          nome: typeof userData.nome === "string" ? userData.nome : "Estudante",
          instituicao: typeof userData.instituicao === "string" ? userData.instituicao : "Sem instituição",
          totalPontos: stats.totalPontos,
          desafiosConcluidos: stats.desafiosConcluidos,
          melhorNota: stats.melhorNota,
        } satisfies RankingItem;
      })
    );

    ranking.sort((a, b) => b.totalPontos - a.totalPontos || b.melhorNota - a.melhorNota);
    onUpdate(ranking);
  });
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
