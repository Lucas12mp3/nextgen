import { CHALLENGE_VERSION, PONTOS_POR_NIVEL, calculatePoints, type DesafioNivel } from "./challenge-policy";

export type VerifiedAchievement = { id: string; userId: string; desafioId: string; nivel: DesafioNivel; nota: number; pontos: number; scoringVersion: number };
export function isVerifiedAchievement(value: unknown): value is VerifiedAchievement {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return item.scoringVersion === CHALLENGE_VERSION && typeof item.userId === "string" && !!item.userId
    && typeof item.desafioId === "string" && !!item.desafioId && item.id === `${item.userId}_${item.desafioId}`
    && Object.hasOwn(PONTOS_POR_NIVEL, String(item.nivel))
    && Number.isInteger(item.nota) && Number(item.nota) > 0 && Number(item.nota) <= 100
    && Number.isInteger(item.pontos) && item.pontos === calculatePoints(item.nivel as DesafioNivel, Number(item.nota));
}
export function aggregateRanking(achievements: unknown[]) {
  const seen = new Set<string>();
  const totals = new Map<string, { userId: string; totalPontos: number; desafiosConcluidos: number; melhorNota: number }>();
  for (const achievement of achievements) {
    if (!isVerifiedAchievement(achievement) || seen.has(achievement.id)) continue;
    seen.add(achievement.id);
    const item = totals.get(achievement.userId) || { userId: achievement.userId, totalPontos: 0, desafiosConcluidos: 0, melhorNota: 0 };
    item.totalPontos += achievement.pontos; item.desafiosConcluidos++; item.melhorNota = Math.max(item.melhorNota, achievement.nota);
    totals.set(achievement.userId, item);
  }
  return [...totals.values()].sort((a, b) => b.totalPontos - a.totalPontos || b.melhorNota - a.melhorNota || a.userId.localeCompare(b.userId));
}
