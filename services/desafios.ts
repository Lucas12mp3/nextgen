import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
export type Pergunta = { enunciado: string; opcoes: string[] };
export type PerguntaComGabarito = Pergunta & { correta: number };
export type DesafioNivel = "iniciante" | "intermediario" | "avancado";
export const PONTOS_POR_NIVEL: Record<DesafioNivel, number> = { iniciante: 100, intermediario: 200, avancado: 350 };
export type Desafio = { id: string; empresaId: string; empresaNome: string; titulo: string; descricao: string; area: string; nivel: DesafioNivel; notaMinima: number; pontos?: number; perguntas: Pergunta[]; status: "aberto" | "fechado"; createdAt?: unknown };
export type Conquista = { id: string; userId: string; desafioId: string; desafioTitulo: string; empresaNome: string; nivel: DesafioNivel; nota: number; pontos?: number; createdAt?: unknown };
export type RankingItem = { userId: string; nome: string; instituicao: string; totalPontos: number; desafiosConcluidos: number; melhorNota: number };
export function calcularPontosDesafio(nivel: DesafioNivel, nota?: number) { const base = PONTOS_POR_NIVEL[nivel]; return typeof nota !== "number" ? base : Math.max(25, Math.round(base * nota / 100)); }
export { type AttemptResult } from "@/lib/challenge-policy";
import { CHALLENGE_VERSION, parseChallenge, type AttemptResult } from "@/lib/challenge-policy";

async function api<T>(path: string, body: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Entre na sua conta para continuar.");
  const token = await user.getIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(body), signal: controller.signal, cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "Não foi possível concluir a operação. Tente novamente.");
    if (auth.currentUser?.uid !== user.uid) throw new Error("Sua conta mudou. Entre novamente para continuar.");
    return result as T;
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") throw new Error("A operação demorou mais que o esperado. Tente novamente; seu envio não será duplicado.");
    throw error;
  } finally { clearTimeout(timeout); }
}
const pendingCreations = new Map<string, { fingerprint: string; requestId: string }>();
export async function criarDesafio(payload: { empresaId: string; empresaNome?: string; titulo: string; descricao: string; area: string; nivel: DesafioNivel; notaMinima: number; perguntas: PerguntaComGabarito[] }) {
  if (!auth.currentUser || auth.currentUser.uid !== payload.empresaId) throw new Error("Sessão inválida.");
  const data = parseChallenge(payload), fingerprint = JSON.stringify(data);
  let request = pendingCreations.get(payload.empresaId);
  if (!request || request.fingerprint !== fingerprint) {
    request = { fingerprint, requestId: crypto.randomUUID() };
    pendingCreations.set(payload.empresaId, request);
  }
  const result = await api<{ id: string }>("/api/desafios", { ...data, requestId: request.requestId });
  if (pendingCreations.get(payload.empresaId) === request) pendingCreations.delete(payload.empresaId);
  return result.id;
}
export function subscribeDesafiosAbertos(onUpdate: (items: Desafio[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(query(collection(db, "desafios"), where("status", "==", "aberto"), where("scoringVersion", "==", CHALLENGE_VERSION)), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Desafio[];
    items.sort((a, b) => ((b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0) - ((a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0)); onUpdate(items);
  }, onError);
}
export function subscribeDesafiosEmpresa(uid: string, onUpdate: (items: Desafio[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(query(collection(db, "desafios"), where("empresaId", "==", uid), where("scoringVersion", "==", CHALLENGE_VERSION)), (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Desafio[]), onError);
}
export async function getDesafio(id: string) {
  const snap = await getDoc(doc(db, "desafios", id));
  return snap.exists() && snap.get("scoringVersion") === CHALLENGE_VERSION ? { id: snap.id, ...snap.data() } as Desafio : null;
}
export async function fecharDesafio(id: string) { await api("/api/desafios/fechar", { desafioId: id }); }
export async function enviarTentativa(desafioId: string, respostas: number[]) { return api<AttemptResult>("/api/desafios/tentativa", { desafioId, respostas }); }
export async function getResultado(desafioId: string): Promise<AttemptResult | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Entre na sua conta.");
  const result = await getDocs(query(collection(db, "desafioTentativas"), where("userId", "==", uid), where("scoringVersion", "==", CHALLENGE_VERSION), where("desafioId", "==", desafioId), limit(1)));
  if (result.empty) return null;
  const data = result.docs[0].data();
  return { nota: data.nota, acertos: data.acertos, aprovado: data.aprovado, pontos: data.pontos, duplicated: true };
}
export function subscribeRankingGeral(onUpdate: (items: RankingItem[]) => void, onError?: (error: Error) => void) {
  let active = true;
  let version = 0;
  const stop = onSnapshot(query(collection(db, "conquistas"), where("scoringVersion", "==", CHALLENGE_VERSION)), async (snap) => {
    const currentVersion = ++version;
    try {
    const totals = new Map<string, { totalPontos: number; desafiosConcluidos: number; melhorNota: number }>();
    snap.docs.forEach((item) => {
      const data = item.data(); const uid = typeof data.userId === "string" ? data.userId : item.id; const note = typeof data.nota === "number" ? data.nota : 0; const points = typeof data.pontos === "number" ? data.pontos : 0;
      const stat = totals.get(uid) ?? { totalPontos: 0, desafiosConcluidos: 0, melhorNota: 0 }; stat.totalPontos += points; stat.desafiosConcluidos++; stat.melhorNota = Math.max(stat.melhorNota, note); totals.set(uid, stat);
    });
    const ranking = await Promise.all(Array.from(totals.entries()).map(async ([userId, stat]) => { const u = await getDoc(doc(db, "users", userId)); const data = u.exists() ? u.data() : {}; return { userId, nome: typeof data.nome === "string" ? data.nome : "Estudante", instituicao: typeof data.instituicao === "string" ? data.instituicao : "Sem instituição", ...stat }; }));
    ranking.sort((a, b) => b.totalPontos - a.totalPontos || b.melhorNota - a.melhorNota); if (active && version === currentVersion) onUpdate(ranking);
    } catch (error) { if (active && version === currentVersion) onError?.(error instanceof Error ? error : new Error("Erro ao carregar ranking.")); }
  }, onError);
  return () => { active = false; stop(); };
}
export function subscribeConquistas(uid: string, onUpdate: (items: Conquista[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(query(collection(db, "conquistas"), where("userId", "==", uid), where("scoringVersion", "==", CHALLENGE_VERSION)), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Conquista[];
    items.sort((a, b) => ((b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0) - ((a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0)); onUpdate(items);
  }, onError);
}
