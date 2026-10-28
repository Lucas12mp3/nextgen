import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();
const bucket = getStorage().bucket();
const REGION = "southamerica-east1";
const LEVEL_POINTS = { iniciante: 100, intermediario: 200, avancado: 350 } as const;
type Level = keyof typeof LEVEL_POINTS;

function requireAuth(uid?: string): string {
  if (!uid) throw new HttpsError("unauthenticated", "Faça login para continuar.");
  return uid;
}
function text(value: unknown, field: string, max = 5000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new HttpsError("invalid-argument", `Campo inválido: ${field}.`);
  }
  return value.trim();
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpsError("invalid-argument", "Dados inválidos.");
  return value as Record<string, unknown>;
}
function calculateAge(value: string): number {
  const dob = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(dob.getTime()) || dob.toISOString().slice(0, 10) !== value) throw new HttpsError("invalid-argument", "Data de nascimento inválida.");
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  if (now.getUTCMonth() < dob.getUTCMonth() || (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}
function profileRef(uid: string) { return db.doc(`users/${uid}`); }
async function requireVerifiedCompany(uid: string) {
  const snap = await profileRef(uid).get();
  if (!snap.exists || snap.get("tipoConta") !== "empresa" || snap.get("companyStatus") !== "verified") {
    throw new HttpsError("permission-denied", "A empresa precisa ser aprovada pela administração.");
  }
  return snap.data()!;
}

export const completeRegistration = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const data = object(request.data);
  const nome = text(data.nome, "nome", 120);
  const tipoConta = data.tipoConta;
  if (tipoConta !== "estudante" && tipoConta !== "empresa") throw new HttpsError("invalid-argument", "Tipo de conta inválido.");
  const nascimento = tipoConta === "estudante" ? text(data.dataNascimento, "dataNascimento", 10) : null;
  if (tipoConta === "estudante" && nascimento && calculateAge(nascimento) < 16) {
    await getAuth().deleteUser(uid).catch(() => undefined);
    throw new HttpsError("permission-denied", "O cadastro de menores de 16 anos está temporariamente indisponível.");
  }
  const cpf = typeof data.cpf === "string" ? data.cpf.replace(/\D/g, "") : "";
  const cnpj = typeof data.cnpj === "string" ? data.cnpj.replace(/\D/g, "") : "";
  if (tipoConta === "estudante" && cpf.length !== 11) throw new HttpsError("invalid-argument", "CPF inválido.");
  if (tipoConta === "empresa" && cnpj.length !== 14) throw new HttpsError("invalid-argument", "CNPJ inválido.");
  const privateData: Record<string, unknown> = {
    dataNascimento: nascimento,
    cpf: tipoConta === "estudante" ? cpf : null,
    cnpj: tipoConta === "empresa" ? cnpj : null,
    responsavel: null,
    createdAt: FieldValue.serverTimestamp(),
  };
  await db.runTransaction(async (tx) => {
    const ref = profileRef(uid);
    if ((await tx.get(ref)).exists) throw new HttpsError("already-exists", "O perfil já foi criado.");
    tx.create(ref, {
      uid, nome,
      tipoConta,
      ...(tipoConta === "empresa" ? { ramo: typeof data.ramo === "string" ? data.ramo : null, companyStatus: "pending" } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.create(db.doc(`users/${uid}/privado/dados`), privateData);
  });
  return { ok: true, companyStatus: tipoConta === "empresa" ? "pending" : "verified" };
});

export const updatePublicProfile = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const data = object(request.data);
  const profile = profileRef(uid);
  const current = await profile.get();
  if (!current.exists) throw new HttpsError("failed-precondition", "Perfil não encontrado.");
  const allowed = current.get("tipoConta") === "estudante"
    ? ["titulo", "instituicao", "descricao", "github", "linkedin", "portfolio", "skills"]
    : ["nome", "ramo", "descricao", "site", "linkedin", "tagline", "localizacao"];
  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!allowed.includes(key)) throw new HttpsError("invalid-argument", `Campo não permitido: ${key}.`);
    if (key === "skills") {
      if (!Array.isArray(value) || value.length > 40 || value.some((x) => typeof x !== "string" || x.length > 60)) throw new HttpsError("invalid-argument", "Habilidades inválidas.");
      update[key] = value;
    } else {
      const max = key === "descricao" ? 3000 : 500;
      if (typeof value !== "string" || value.length > max) throw new HttpsError("invalid-argument", `Campo inválido: ${key}.`);
      update[key] = value.trim();
    }
  }
  await profile.update({ ...update, atualizadoEm: FieldValue.serverTimestamp() });
  return { ok: true };
});

export const setResumeObjectPath = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const path = text(object(request.data).path, "path", 300);
  if (!path.startsWith(`curriculos/${uid}/`) || !path.endsWith(".pdf")) throw new HttpsError("invalid-argument", "Caminho do currículo inválido.");
  const user = await profileRef(uid).get();
  if (user.get("tipoConta") !== "estudante") throw new HttpsError("permission-denied", "Somente estudantes podem cadastrar currículo.");
  if (!(await bucket.file(path).exists())[0]) throw new HttpsError("not-found", "Arquivo não encontrado.");
  await db.doc(`users/${uid}/privado/dados`).set({ resumeObjectPath: path }, { merge: true });
  return { ok: true };
});

export const getResumeDownloadUrl = onCall({ region: REGION }, async (request) => {
  const caller = requireAuth(request.auth?.uid);
  const studentUid = text(object(request.data).studentUid, "studentUid", 128);
  const candidate = await profileRef(studentUid).get();
  if (!candidate.exists || candidate.get("tipoConta") !== "estudante") throw new HttpsError("not-found", "Candidato não encontrado.");
  if (caller !== studentUid) {
    await requireVerifiedCompany(caller);
    const grant = await db.doc(`resumeAccess/${studentUid}/companies/${caller}`).get();
    if (!grant.exists) throw new HttpsError("permission-denied", "O currículo só fica disponível após candidatura.");
  }
  const privateData = await db.doc(`users/${studentUid}/privado/dados`).get();
  const path = privateData.get("resumeObjectPath");
  if (typeof path !== "string" || !path.startsWith(`curriculos/${studentUid}/`)) throw new HttpsError("not-found", "Currículo não cadastrado.");
  const [url] = await bucket.file(path).getSignedUrl({ action: "read", expires: Date.now() + 5 * 60 * 1000 });
  return { url, expiresInSeconds: 300 };
});

export const approveCompany = onCall({ region: REGION }, async (request) => {
  const adminUid = requireAuth(request.auth?.uid);
  const targetUid = text(object(request.data).companyUid, "companyUid", 128);
  if (!(await db.doc(`admins/${adminUid}`).get()).exists) throw new HttpsError("permission-denied", "Somente administradores podem aprovar empresas.");
  const target = await profileRef(targetUid).get();
  if (!target.exists || target.get("tipoConta") !== "empresa") throw new HttpsError("not-found", "Empresa não encontrada.");
  await profileRef(targetUid).update({ companyStatus: "verified", companyApprovedAt: FieldValue.serverTimestamp(), companyApprovedBy: adminUid });
  return { ok: true };
});

export const createVacancy = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const company = await requireVerifiedCompany(uid);
  const data = object(request.data);
  const ref = db.collection("vagas").doc();
  await ref.create({
    empresaId: uid, empresaNome: company.nome,
    titulo: text(data.titulo, "titulo", 160), descricao: text(data.descricao, "descricao", 5000),
    requisitos: text(data.requisitos, "requisitos", 3000), modalidade: text(data.modalidade, "modalidade", 80),
    local: text(data.local, "local", 160), status: "aberta", createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
});

export const sendProposal = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const company = await requireVerifiedCompany(uid);
  const data = object(request.data);
  const toUserId = text(data.toUserId, "toUserId", 128);
  const candidate = await profileRef(toUserId).get();
  if (!candidate.exists || candidate.get("tipoConta") !== "estudante") throw new HttpsError("not-found", "Estudante não encontrado.");
  const ref = db.collection("proposals").doc();
  await ref.create({ fromCompanyId: uid, fromCompanyName: company.nome, toUserId, role: text(data.role, "role", 160), message: text(data.message, "message", 2000), requirements: typeof data.requirements === "string" ? data.requirements.slice(0, 2000) : null, status: "pending", read: false, createdAt: FieldValue.serverTimestamp() });
  return { id: ref.id };
});

export const submitApplication = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const student = await profileRef(uid).get();
  if (!student.exists || student.get("tipoConta") !== "estudante") throw new HttpsError("permission-denied", "Somente estudantes podem se candidatar.");
  const data = object(request.data);
  const vacancyId = text(data.vagaId, "vagaId", 128);
  const vacancyRef = db.doc(`vagas/${vacancyId}`);
  const vacancy = await vacancyRef.get();
  if (!vacancy.exists || vacancy.get("status") !== "aberta") throw new HttpsError("failed-precondition", "Vaga indisponível.");
  const companyUid = vacancy.get("empresaId");
  if (typeof companyUid !== "string") throw new HttpsError("failed-precondition", "Empresa da vaga inválida.");
  await requireVerifiedCompany(companyUid);
  const dup = await db.collection("applications").where("fromUserId", "==", uid).where("vagaId", "==", vacancyId).limit(1).get();
  if (!dup.empty) throw new HttpsError("already-exists", "Você já se candidatou para esta vaga.");
  const ref = db.doc(`applications/${uid}_${vacancyId}`);
  const batch = db.batch();
  batch.create(ref, { fromUserId: uid, fromUserName: student.get("nome"), toCompanyId: companyUid, toCompanyName: vacancy.get("empresaNome"), vagaId: vacancyId, role: vacancy.get("titulo"), message: text(data.message ?? "Tenho interesse nesta vaga.", "message", 2000), status: "pending", createdAt: FieldValue.serverTimestamp(), read: false });
  batch.set(db.doc(`resumeAccess/${uid}/companies/${companyUid}`), { grantedAt: FieldValue.serverTimestamp(), applicationId: ref.id }, { merge: true });
  await batch.commit();
  return { id: ref.id };
});

export const createChallenge = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const company = await requireVerifiedCompany(uid);
  const data = object(request.data);
  const level = data.nivel as Level;
  if (!Object.hasOwn(LEVEL_POINTS, level)) throw new HttpsError("invalid-argument", "Nível inválido.");
  const notaMinima = data.notaMinima;
  if (typeof notaMinima !== "number" || notaMinima < 0 || notaMinima > 100) throw new HttpsError("invalid-argument", "Nota mínima inválida.");
  if (!Array.isArray(data.perguntas) || data.perguntas.length < 1 || data.perguntas.length > 20) throw new HttpsError("invalid-argument", "Quantidade de perguntas inválida.");
  const perguntas = data.perguntas.map((raw, i) => {
    const q = object(raw);
    if (!Array.isArray(q.opcoes) || q.opcoes.length < 2 || q.opcoes.length > 5 || q.opcoes.some((x) => typeof x !== "string" || !x.trim())) throw new HttpsError("invalid-argument", `Opções inválidas na pergunta ${i + 1}.`);
    if (!Number.isInteger(q.correta) || (q.correta as number) < 0 || (q.correta as number) >= q.opcoes.length) throw new HttpsError("invalid-argument", `Gabarito inválido na pergunta ${i + 1}.`);
    return { enunciado: text(q.enunciado, `perguntas.${i}.enunciado`, 1000), opcoes: (q.opcoes as string[]).map((x) => x.trim()), correta: q.correta as number };
  });
  const ref = db.collection("desafios").doc();
  const safeQuestions = perguntas.map(({ enunciado, opcoes }) => ({ enunciado, opcoes }));
  const batch = db.batch();
  batch.create(ref, { empresaId: uid, empresaNome: company.nome, titulo: text(data.titulo, "titulo", 160), descricao: text(data.descricao, "descricao", 3000), area: text(data.area, "area", 120), nivel: level, notaMinima, pontos: LEVEL_POINTS[level], perguntas: safeQuestions, status: "aberto", createdAt: FieldValue.serverTimestamp() });
  batch.create(db.doc(`desafioSegredos/${ref.id}`), { respostasCorretas: perguntas.map((q) => q.correta) });
  await batch.commit();
  return { id: ref.id };
});

export const submitChallengeAttempt = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  const student = await profileRef(uid).get();
  if (!student.exists || student.get("tipoConta") !== "estudante") throw new HttpsError("permission-denied", "Somente estudantes podem responder desafios.");
  const data = object(request.data);
  const challengeId = text(data.desafioId, "desafioId", 128);
  if (!Array.isArray(data.respostas) || data.respostas.length > 20 || data.respostas.some((x) => !Number.isInteger(x))) throw new HttpsError("invalid-argument", "Respostas inválidas.");
  const answers = data.respostas as number[];
  const challengeRef = db.doc(`desafios/${challengeId}`);
  const secretRef = db.doc(`desafioSegredos/${challengeId}`);
  const achievementRef = db.doc(`conquistas/${uid}_${challengeId}`);
  return db.runTransaction(async (tx) => {
    const [challenge, secret, existing] = await Promise.all([tx.get(challengeRef), tx.get(secretRef), tx.get(achievementRef)]);
    if (!challenge.exists || challenge.get("status") !== "aberto" || !secret.exists) throw new HttpsError("failed-precondition", "Desafio indisponível.");
    if (existing.exists) return { nota: existing.get("nota"), acertos: null, aprovado: true, pontos: existing.get("pontos"), duplicated: true };
    const keys = secret.get("respostasCorretas");
    const questions = challenge.get("perguntas");
    if (!Array.isArray(keys) || !Array.isArray(questions) || answers.length !== keys.length || questions.length !== keys.length) throw new HttpsError("invalid-argument", "Responda todas as perguntas.");
    const acertos = keys.reduce((n: number, key: unknown, i: number) => n + (answers[i] === key ? 1 : 0), 0);
    const nota = Math.round(acertos / keys.length * 100);
    const aprovado = nota >= challenge.get("notaMinima");
    const nivel = challenge.get("nivel") as Level;
    if (!Object.hasOwn(LEVEL_POINTS, nivel)) throw new HttpsError("failed-precondition", "Nível do desafio inválido.");
    if (answers.some((answer, index) => answer < 0 || answer >= (questions[index] as { opcoes?: unknown[] }).opcoes!.length)) throw new HttpsError("invalid-argument", "Uma ou mais respostas estão fora das opções disponíveis.");
    const pontos = aprovado ? Math.max(25, Math.round(LEVEL_POINTS[nivel] * (nota / 100))) : 0;
    if (aprovado) tx.create(achievementRef, { userId: uid, desafioId: challengeId, desafioTitulo: challenge.get("titulo"), empresaNome: challenge.get("empresaNome"), nivel, nota, pontos, createdAt: FieldValue.serverTimestamp() });
    return { nota, acertos, aprovado, pontos, duplicated: false };
  });
});

export const closeChallenge = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request.auth?.uid);
  await requireVerifiedCompany(uid);
  const id = text(object(request.data).desafioId, "desafioId", 128);
  const ref = db.doc(`desafios/${id}`);
  const doc = await ref.get();
  if (!doc.exists || doc.get("empresaId") !== uid) throw new HttpsError("permission-denied", "Desafio não pertence a esta empresa.");
  await ref.update({ status: "fechado" });
  return { ok: true };
});
