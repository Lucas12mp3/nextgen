export const CHALLENGE_VERSION = 2;
export const PONTOS_POR_NIVEL = { iniciante: 100, intermediario: 200, avancado: 350 } as const;
export type DesafioNivel = keyof typeof PONTOS_POR_NIVEL;
export type Pergunta = { enunciado: string; opcoes: string[] };
export type PerguntaComGabarito = Pergunta & { correta: number };
export type AttemptResult = { nota: number; acertos: number; aprovado: boolean; pontos: number; duplicated: boolean };
export class ChallengeError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function challengeId(value: unknown) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) throw new ChallengeError(400, "Desafio inválido.");
  return value;
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ChallengeError(400, "Dados inválidos.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, label: string) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new ChallengeError(400, `Confira ${label} e o limite de ${max} caracteres.`);
  return value.trim();
}
export function normalizeQuestions(value: unknown): PerguntaComGabarito[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5) throw new ChallengeError(400, "Inclua entre 1 e 5 perguntas.");
  return value.map((raw, i) => {
    const q = object(raw);
    if (!Array.isArray(q.opcoes) || q.opcoes.length < 2 || q.opcoes.length > 5 || q.opcoes.some(option => typeof option !== "string")) throw new ChallengeError(400, `Confira as alternativas da pergunta ${i + 1}.`);
    const entries = (q.opcoes as string[]).map((option, index) => ({ option: option.trim(), index })).filter(item => item.option);
    if (entries.length < 2 || entries.some(item => item.option.length > 300) || new Set(entries.map(item => item.option.toLocaleLowerCase("pt-BR"))).size !== entries.length) throw new ChallengeError(400, `A pergunta ${i + 1} precisa de alternativas distintas, com até 300 caracteres.`);
    const correct = Number.isInteger(q.correta) ? entries.findIndex(item => item.index === q.correta) : -1;
    if (correct < 0) throw new ChallengeError(400, `Selecione uma alternativa preenchida como correta na pergunta ${i + 1}.`);
    return { enunciado: text(q.enunciado, 1000, `o enunciado da pergunta ${i + 1}`), opcoes: entries.map(item => item.option), correta: correct };
  });
}
export function parseChallenge(value: unknown) {
  const data = object(value);
  if (!Object.hasOwn(PONTOS_POR_NIVEL, String(data.nivel))) throw new ChallengeError(400, "Selecione um nível válido.");
  if (!Number.isInteger(data.notaMinima) || Number(data.notaMinima) < 1 || Number(data.notaMinima) > 100) throw new ChallengeError(400, "A nota mínima deve ser um inteiro entre 1 e 100.");
  return { titulo: text(data.titulo, 160, "o título"), descricao: text(data.descricao, 3000, "a descrição"), area: text(data.area, 120, "a área"),
    nivel: data.nivel as DesafioNivel, notaMinima: data.notaMinima as number, perguntas: normalizeQuestions(data.perguntas) };
}
export function calculatePoints(level: DesafioNivel, grade?: number) {
  const base = PONTOS_POR_NIVEL[level];
  return typeof grade === "number" ? Math.max(25, Math.round(base * grade / 100)) : base;
}
export function gradeAnswers(challenge: Record<string, unknown>, secret: Record<string, unknown>, answers: unknown): Omit<AttemptResult, "duplicated"> {
  const questions = challenge.perguntas as Pergunta[];
  const keys = secret.respostasCorretas;
  if (challenge.scoringVersion !== CHALLENGE_VERSION || !Array.isArray(questions) || questions.length < 1 || questions.length > 5 || !Array.isArray(keys) || keys.length !== questions.length
    || !Object.hasOwn(PONTOS_POR_NIVEL, String(challenge.nivel)) || !Number.isInteger(challenge.notaMinima) || Number(challenge.notaMinima) < 1 || Number(challenge.notaMinima) > 100
    || questions.some((q, i) => !Array.isArray(q.opcoes) || q.opcoes.length < 2 || q.opcoes.length > 5 || "correta" in q || !Number.isInteger(keys[i]) || keys[i] < 0 || keys[i] >= q.opcoes.length)) throw new ChallengeError(409, "Este desafio precisa ser republicado pela empresa para receber correção verificada.");
  if (!Array.isArray(answers) || answers.length !== keys.length || answers.some((answer, i) => !Number.isInteger(answer) || answer < 0 || answer >= questions[i].opcoes.length)) throw new ChallengeError(400, "Responda todas as perguntas com uma alternativa válida.");
  const acertos = keys.reduce((sum: number, key, i) => sum + (answers[i] === key ? 1 : 0), 0);
  const nota = Math.round(acertos / keys.length * 100);
  const aprovado = nota >= Number(challenge.notaMinima);
  return { nota, acertos, aprovado, pontos: aprovado ? calculatePoints(challenge.nivel as DesafioNivel, nota) : 0 };
}
