import "server-only";
import { createHash } from "node:crypto";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { CHALLENGE_VERSION, ChallengeError, PONTOS_POR_NIVEL, challengeId, gradeAnswers, object, parseChallenge, type AttemptResult } from "@/lib/challenge-policy";

function company(profile: Record<string, unknown> | undefined) {
  if (profile?.tipoConta !== "empresa" || profile.companyStatus !== "verified") throw new ChallengeError(403, "A empresa precisa de aprovação administrativa para gerenciar desafios.");
}
export function challengeService(db: Firestore) {
  return {
    async create(uid: string, input: unknown) {
      const raw = object(input), data = parseChallenge(raw);
      if (typeof raw.requestId !== "string" || !/^[a-f0-9-]{36}$/.test(raw.requestId)) throw new ChallengeError(400, "Identificador de envio inválido.");
      const id = raw.requestId, ref = db.doc(`desafios/${id}`), secret = db.doc(`desafioSegredos/${id}`);
      const digest = createHash("sha256").update(JSON.stringify(data)).digest("hex");
      await db.runTransaction(async tx => {
        const [profile, existing, key] = await Promise.all([tx.get(db.doc(`users/${uid}`)), tx.get(ref), tx.get(secret)]);
        company(profile.data());
        if (existing.exists) {
          if (existing.get("empresaId") !== uid || key.get("creationDigest") !== digest) throw new ChallengeError(409, "Esta requisição já foi utilizada. Confira seus desafios publicados.");
          return;
        }
        const rateRef = db.doc(`challengeRateLimits/${uid}`), rate = await tx.get(rateRef);
        if (Date.now() - (rate.get("createdAt")?.toMillis?.() ?? 0) < 10000) throw new ChallengeError(429, "Aguarde alguns segundos antes de publicar outro desafio.");
        const { perguntas, ...fields } = data;
        tx.create(ref, { ...fields, perguntas: perguntas.map(({ enunciado, opcoes }) => ({ enunciado, opcoes })), empresaId: uid, empresaNome: profile.get("nome"), pontos: PONTOS_POR_NIVEL[data.nivel], status: "aberto", scoringVersion: CHALLENGE_VERSION, createdAt: FieldValue.serverTimestamp() });
        tx.create(secret, { respostasCorretas: perguntas.map(q => q.correta), creationDigest: digest });
        tx.set(rateRef, { createdAt: FieldValue.serverTimestamp() });
      });
      return { id };
    },
    async close(uid: string, input: unknown) {
      const id = challengeId(object(input).desafioId);
      await db.runTransaction(async tx => {
        const [profile, challenge] = await Promise.all([tx.get(db.doc(`users/${uid}`)), tx.get(db.doc(`desafios/${id}`))]);
        company(profile.data());
        if (!challenge.exists || challenge.get("empresaId") !== uid) throw new ChallengeError(403, "Este desafio não pertence à sua empresa.");
        tx.update(challenge.ref, { status: "fechado" });
      });
      return { ok: true };
    },
    async result(uid: string, idValue: unknown): Promise<AttemptResult | null> {
      const id = challengeId(idValue);
      const attempt = await db.doc(`desafioTentativas/${uid}_${id}`).get();
      return attempt.exists ? { nota: attempt.get("nota"), acertos: attempt.get("acertos"), aprovado: attempt.get("aprovado"), pontos: attempt.get("pontos"), duplicated: true } : null;
    },
    async submit(uid: string, input: unknown): Promise<AttemptResult> {
      const data = object(input), id = challengeId(data.desafioId);
      if (Object.keys(data).some(key => !["desafioId", "respostas"].includes(key))) throw new ChallengeError(400, "Envie somente suas respostas para correção.");
      return db.runTransaction(async tx => {
        const attemptRef = db.doc(`desafioTentativas/${uid}_${id}`);
        const [profile, challenge, attempt] = await Promise.all([tx.get(db.doc(`users/${uid}`)), tx.get(db.doc(`desafios/${id}`)), tx.get(attemptRef)]);
        if (profile.get("tipoConta") !== "estudante") throw new ChallengeError(403, "Somente estudantes podem responder desafios.");
        if (attempt.exists) return { nota: attempt.get("nota"), acertos: attempt.get("acertos"), aprovado: attempt.get("aprovado"), pontos: attempt.get("pontos"), duplicated: true };
        if (!challenge.exists || challenge.get("status") !== "aberto") throw new ChallengeError(409, "Este desafio não está disponível para novas respostas.");
        const [secret, author] = await Promise.all([tx.get(db.doc(`desafioSegredos/${id}`)), tx.get(db.doc(`users/${challenge.get("empresaId")}`))]);
        company(author.data());
        const result = gradeAnswers(challenge.data()!, secret.data() || {}, data.respostas);
        const common = { userId: uid, desafioId: id, desafioTitulo: challenge.get("titulo"), empresaNome: challenge.get("empresaNome"), nivel: challenge.get("nivel"), scoringVersion: CHALLENGE_VERSION, createdAt: FieldValue.serverTimestamp() };
        tx.create(attemptRef, { ...common, ...result, respostas: data.respostas });
        if (result.aprovado) tx.set(db.doc(`conquistas/${uid}_${id}`), { ...common, nota: result.nota, pontos: result.pontos });
        return { ...result, duplicated: false };
      });
    },
  };
}
