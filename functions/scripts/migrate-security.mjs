import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const apply = process.argv.includes("--apply");
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
if (!projectId) throw new Error("Defina GCLOUD_PROJECT ou FIREBASE_PROJECT_ID antes de executar.");
if (!storageBucket) throw new Error("Defina FIREBASE_STORAGE_BUCKET com o bucket exibido na configuração do Firebase.");
initializeApp({ credential: applicationDefault(), projectId, storageBucket });
const db = getFirestore();
const bucket = getStorage().bucket();
const users = await db.collection("users").get();
const challenges = await db.collection("desafios").get();
const applications = await db.collection("applications").get();

const operations = [];
let removedPublicEmail = 0;
let removedPublicResume = 0;
let removedPublicAge = 0;
let migratedResumePath = 0;
let pendingCompanies = 0;
let movedAnswerKeys = 0;
let resumeGrants = 0;
const errors = [];

for (const userDoc of users.docs) {
  const data = userDoc.data();
  const update = {};
  if (Object.hasOwn(data, "email")) { update.email = FieldValue.delete(); removedPublicEmail++; }
  if (Object.hasOwn(data, "faixaEtaria")) { update.faixaEtaria = FieldValue.delete(); removedPublicAge++; }
  if (Object.hasOwn(data, "resumeUrl")) {
    const legacyUrl = data.resumeUrl;
    update.resumeUrl = FieldValue.delete();
    removedPublicResume++;
    if (typeof legacyUrl === "string") {
      try {
        const parsed = new URL(legacyUrl);
        const match = parsed.pathname.match(/\/o\/([^/]+)$/);
        const objectPath = match ? decodeURIComponent(match[1]) : "";
        if (parsed.hostname === "firebasestorage.googleapis.com" && objectPath.startsWith(`curriculos/${userDoc.id}/`) && objectPath.toLowerCase().endsWith(".pdf")) {
          operations.push({ type: "privateResume", uid: userDoc.id, path: objectPath });
          migratedResumePath++;
        }
      } catch { /* external or malformed URL: remove it from the public profile only */ }
    }
  }
  if (data.tipoConta === "empresa" && data.companyStatus !== "pending") { update.companyStatus = "pending"; pendingCompanies++; }
  if (Object.keys(update).length) operations.push({ type: "userUpdate", ref: userDoc.ref, data: update });
}

for (const challengeDoc of challenges.docs) {
  const data = challengeDoc.data();
  if (!Array.isArray(data.perguntas)) { errors.push(`Desafio ${challengeDoc.id}: perguntas ausentes ou inválidas.`); continue; }
  const questions = data.perguntas;
  const keys = questions.map((question) => question && Number.isInteger(question.correta) && question.correta >= 0 && Array.isArray(question.opcoes) && question.correta < question.opcoes.length ? question.correta : null);
  const secretRef = db.doc(`desafioSegredos/${challengeDoc.id}`);
  const secret = await secretRef.get();
  if (!secret.exists && keys.some((key) => key === null)) { errors.push(`Desafio ${challengeDoc.id}: gabarito incompleto; revise antes de migrar.`); continue; }
  if (!secret.exists) { operations.push({ type: "secret", ref: secretRef, data: { respostasCorretas: keys } }); movedAnswerKeys++; }
  const safeQuestions = questions.map((question) => { const safe = { ...question }; delete safe.correta; return safe; });
  if (safeQuestions.some((question, i) => Object.hasOwn(questions[i], "correta"))) operations.push({ type: "challengeUpdate", ref: challengeDoc.ref, data: { perguntas: safeQuestions } });
}

for (const application of applications.docs) {
  const data = application.data();
  if (typeof data.fromUserId === "string" && typeof data.toCompanyId === "string") {
    operations.push({ type: "grant", ref: db.doc(`resumeAccess/${data.fromUserId}/companies/${data.toCompanyId}`), data: { grantedAt: data.createdAt || FieldValue.serverTimestamp(), applicationId: application.id } });
    resumeGrants++;
  }
}

if (errors.length) throw new Error(`Migração interrompida sem gravar dados:\n${errors.join("\n")}`);
const [files] = await bucket.getFiles({ prefix: "curriculos/" });
const tokenFiles = [];
for (const file of files) {
  const [metadata] = await file.getMetadata();
  if (metadata.metadata?.firebaseStorageDownloadTokens) tokenFiles.push(file);
}

console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY RUN", projectId, users: users.size, challenges: challenges.size, plannedWrites: operations.length, removedPublicEmail, removedPublicResume, removedPublicAge, migratedResumePath, pendingCompanies, movedAnswerKeys, resumeGrants, legacyDownloadTokensToRevoke: tokenFiles.length }, null, 2));
if (!apply) {
  console.log("Nenhum dado foi alterado. Revise o resumo e execute novamente com --apply para confirmar.");
  process.exit(0);
}

for (let start = 0; start < operations.length; start += 400) {
  const batch = db.batch();
  for (const op of operations.slice(start, start + 400)) {
    if (op.type === "userUpdate" || op.type === "challengeUpdate") batch.update(op.ref, op.data);
    else if (op.type === "privateResume") batch.set(db.doc(`users/${op.uid}/privado/dados`), { resumeObjectPath: op.path }, { merge: true });
    else if (op.type === "secret") batch.create(op.ref, op.data);
    else if (op.type === "grant") batch.set(op.ref, op.data, { merge: true });
  }
  await batch.commit();
}
for (const file of tokenFiles) {
  await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: null } });
}
console.log("Migração concluída. Currículos com links externos foram removidos do perfil; esses links precisam ser revogados no serviço de origem.");
