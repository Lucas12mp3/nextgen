import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/firebase/config";
export type Pergunta = { enunciado: string; opcoes: string[] };
export type PerguntaComGabarito = Pergunta & { correta: number };
export type DesafioNivel = "iniciante" | "intermediario" | "avancado";
export const PONTOS_POR_NIVEL: Record<DesafioNivel, number> = { iniciante: 100, intermediario: 200, avancado: 350 };
export type Desafio = { id: string; empresaId: string; empresaNome: string; titulo: string; descricao: string; area: string; nivel: DesafioNivel; notaMinima: number; pontos?: number; perguntas: Pergunta[]; status: "aberto" | "fechado"; createdAt?: unknown };
export type Conquista = { id: string; userId: string; desafioId: string; desafioTitulo: string; empresaNome: string; nivel: DesafioNivel; nota: number; pontos?: number; createdAt?: unknown };
export type RankingItem = { userId: string; nome: string; instituicao: string; totalPontos: number; desafiosConcluidos: number; melhorNota: number };
export function calcularPontosDesafio(nivel: DesafioNivel, nota?: number) { const base = PONTOS_POR_NIVEL[nivel]; return typeof nota !== "number" ? base : Math.max(25, Math.round(base * nota / 100)); }
export async function criarDesafio(payload: { empresaId: string; empresaNome?: string; titulo: string; descricao: string; area: string; nivel: DesafioNivel; notaMinima: number; perguntas: PerguntaComGabarito[] }) {
  if (!auth.currentUser || auth.currentUser.uid !== payload.empresaId) throw new Error("Sessão inválida.");
  const result = await httpsCallable(functions, "createChallenge")(payload);
  return (result.data as { id: string }).id;
}
export function subscribeDesafiosAbertos(onUpdate: (items: Desafio[]) => void) {
  return onSnapshot(query(collection(db, "desafios"), where("status", "==", "aberto")), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Desafio[];
    items.sort((a, b) => ((b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0) - ((a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0)); onUpdate(items);
  });
}
export function subscribeDesafiosEmpresa(uid: string, onUpdate: (items: Desafio[]) => void) {
  return onSnapshot(query(collection(db, "desafios"), where("empresaId", "==", uid)), (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Desafio[]));
}
export async function getDesafio(id: string) { const snap = await getDoc(doc(db, "desafios", id)); return snap.exists() ? ({ id: snap.id, ...snap.data() } as Desafio) : null; }
export async function fecharDesafio(id: string) { await httpsCallable(functions, "closeChallenge")({ desafioId: id }); }
export async function enviarTentativa(desafioId: string, respostas: number[]) {
  const result = await httpsCallable<{ desafioId: string; respostas: number[] }, { nota: number; acertos: number | null; aprovado: boolean; pontos: number; duplicated: boolean }>(functions, "submitChallengeAttempt")({ desafioId, respostas });
  return result.data;
}
export function subscribeRankingGeral(onUpdate: (items: RankingItem[]) => void) {
  return onSnapshot(collection(db, "conquistas"), async (snap) => {
    const totals = new Map<string, { totalPontos: number; desafiosConcluidos: number; melhorNota: number }>();
    snap.docs.forEach((item) => {
      const data = item.data(); const uid = typeof data.userId === "string" ? data.userId : item.id; const note = typeof data.nota === "number" ? data.nota : 0; const points = typeof data.pontos === "number" ? data.pontos : 0;
      const stat = totals.get(uid) ?? { totalPontos: 0, desafiosConcluidos: 0, melhorNota: 0 }; stat.totalPontos += points; stat.desafiosConcluidos++; stat.melhorNota = Math.max(stat.melhorNota, note); totals.set(uid, stat);
    });
    const ranking = await Promise.all(Array.from(totals.entries()).map(async ([userId, stat]) => { const u = await getDoc(doc(db, "users", userId)); const data = u.exists() ? u.data() : {}; return { userId, nome: typeof data.nome === "string" ? data.nome : "Estudante", instituicao: typeof data.instituicao === "string" ? data.instituicao : "Sem instituição", ...stat }; }));
    ranking.sort((a, b) => b.totalPontos - a.totalPontos || b.melhorNota - a.melhorNota); onUpdate(ranking);
  });
}
export function subscribeConquistas(uid: string, onUpdate: (items: Conquista[]) => void) {
  return onSnapshot(query(collection(db, "conquistas"), where("userId", "==", uid)), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Conquista[];
    items.sort((a, b) => ((b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0) - ((a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0)); onUpdate(items);
  });
}
