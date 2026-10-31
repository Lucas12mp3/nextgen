import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as sdk from "firebase/firestore";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, writeBatch, Timestamp, serverTimestamp } from "firebase/firestore";

let env;
const stores = new Map();
const db = uid => {
  if (!stores.has(uid)) stores.set(uid, env.authenticatedContext(uid).firestore());
  return stores.get(uid);
};
const compile = path => ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function loadService(path, userId, authMocks = null) {
  const exports = {};
  vm.runInThisContext(`(function(exports, require) { ${compile(path)} })`)(exports, name => {
    if (name === "firebase/firestore") return sdk;
    if (name === "firebase/auth" && authMocks) return authMocks;
    if (name === "./registration-policy") {
      const policy = {};
      vm.runInThisContext(`(function(exports) { ${compile("services/registration-policy.ts")} })`)(policy);
      return policy;
    }
    if (name === "@/firebase/config") return { auth: { currentUser: { uid: userId } }, db: db(userId) };
    throw new Error(`Unexpected module ${name}`);
  });
  return exports;
}
function birthday(age, offset = 0) {
  const now = new Date();
  return Timestamp.fromDate(new Date(Date.UTC(now.getUTCFullYear() - age, now.getUTCMonth(), now.getUTCDate() + offset)));
}
function registration(uid, type = "estudante", options = {}) {
  const store = db(uid), batch = writeBatch(store);
  batch.set(doc(store, "users", uid), { uid, nome: type === "empresa" ? "Empresa Demonstração" : "Estudante Demonstração", tipoConta: type,
    ...(type === "empresa" ? { ramo: "Tecnologia", companyStatus: "pending" } : {}), createdAt: serverTimestamp(), ...options.public });
  batch.set(doc(store, "users", uid, "privado", "dados"), { dataNascimento: type === "estudante" ? birthday(17) : null,
    cpf: type === "estudante" ? "52998224725" : null, cnpj: type === "empresa" ? "11222333000181" : null, responsavel: null,
    createdAt: serverTimestamp(), ...options.private });
  return batch.commit();
}
before(async () => { env = await initializeTestEnvironment({ projectId: "demo-nextgen-chat", firestore: { host: "127.0.0.1", port: 8089, rules: readFileSync("firebase/firestore.rules", "utf8") } }); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => setDoc(doc(context.firestore(), "admins", "admin"), { nome: "Administrador" }));
});
after(async () => { await env?.cleanup(); });

test("cadastro atômico separa dados privados e impede leitura por terceiros", async () => {
  await assertSucceeds(registration("student"));
  const publicProfile = (await getDoc(doc(db("student"), "users", "student"))).data();
  assert.equal(publicProfile.cpf, undefined); assert.equal(publicProfile.dataNascimento, undefined);
  await assertSucceeds(getDoc(doc(db("student"), "users", "student", "privado", "dados")));
  await assertFails(getDoc(doc(db("outsider"), "users", "student", "privado", "dados")));
});
test("serviço de cadastro grava os documentos usando a identidade criada no Auth", async () => {
  const calls = [];
  const service = loadService("services/autenticar.ts", "new-student", {
    createUserWithEmailAndPassword: async (_auth, email) => { calls.push(email); return { user: { uid: "new-student" } }; },
    updateProfile: async () => {}, deleteUser: async () => { throw new Error("Cadastro válido não deveria excluir a conta"); },
  });
  await service.cadastrar({ nome: "Estudante Demonstração", email: " aluno@example.com ", senha: "demo-only-password", tipoConta: "estudante", cpf: "529.982.247-25", dataNascimento: "2008-01-01" });
  assert.equal(calls[0], "aluno@example.com");
  assert.equal((await getDoc(doc(db("new-student"), "users", "new-student"))).get("nome"), "Estudante Demonstração");
  assert.equal((await getDoc(doc(db("new-student"), "users", "new-student", "privado", "dados"))).get("cpf"), "52998224725");
});
test("perfil público sem documento privado e cadastro de outra pessoa são recusados", async () => {
  await assertFails(setDoc(doc(db("student"), "users", "student"), { uid: "student", nome: "Aluno", tipoConta: "estudante", createdAt: serverTimestamp() }));
  const batch = writeBatch(db("outsider"));
  batch.set(doc(db("outsider"), "users", "victim"), { uid: "victim", nome: "Aluno", tipoConta: "estudante", createdAt: serverTimestamp() });
  await assertFails(batch.commit());
});
test("idade mínima é conferida pelas regras, inclusive o aniversário", async () => {
  await assertFails(registration("young", "estudante", { private: { dataNascimento: birthday(16, 1) } }));
  await assertSucceeds(registration("birthday", "estudante", { private: { dataNascimento: birthday(16) } }));
  await assertFails(registration("string-date", "estudante", { private: { dataNascimento: "2000-01-01" } }));
});
test("cadastro não permite expor CPF, criar administrador ou autoaprovar empresa", async () => {
  await assertFails(registration("exposed", "estudante", { public: { cpf: "52998224725" } }));
  await assertFails(setDoc(doc(db("student"), "admins", "student"), { nome: "Admin" }));
  await assertFails(registration("self-approved", "empresa", { public: { companyStatus: "verified" } }));
  await assertSucceeds(registration("company", "empresa"));
  await assertFails(updateDoc(doc(db("company"), "users", "company"), { companyStatus: "verified" }));
});
test("aprovação administrativa libera publicação e candidatura pelo serviço real", async () => {
  await registration("company", "empresa"); await registration("student");
  const jobs = loadService("services/vagas.ts", "company");
  const payload = { empresaId: "company", empresaNome: "Nome forjado", titulo: "Aprendiz em tecnologia", descricao: "Apoio à equipe e aprendizado supervisionado.", requisitos: "Interesse em tecnologia e disponibilidade para aprender.", modalidade: "Remoto", local: "São Paulo, SP", status: "aberta" };
  await assert.rejects(jobs.criarVaga(payload), /aprovação/);
  const adminBatch = writeBatch(db("admin"));
  adminBatch.update(doc(db("admin"), "users", "company"), { companyStatus: "verified", companyReviewedAt: serverTimestamp(), companyReviewedBy: "admin", companyReviewAuditId: "approve-company" });
  adminBatch.set(doc(db("admin"), "adminAudit", "approve-company"), { action: "companyAuthorization", targetId: "company", status: "verified", previousStatus: "pending", reason: "Dados da empresa conferidos para demonstração.", adminUid: "admin", createdAt: serverTimestamp() });
  await assertSucceeds(adminBatch.commit());
  const jobId = await jobs.criarVaga(payload);
  assert.equal((await getDoc(doc(db("student"), "vagas", jobId))).get("empresaNome"), "Empresa Demonstração");
  const applications = loadService("services/applications.ts", "student");
  const applicationId = await applications.sendApplication({ fromUserId: "student", vagaId: jobId });
  await assertFails(applications.sendApplication({ fromUserId: "student", vagaId: jobId }));
  await assertSucceeds(getDoc(doc(db("company"), "applications", applicationId)));
  await assertSucceeds(updateDoc(doc(db("company"), "applications", applicationId), { status: "reviewed", read: true }));
  assert.equal((await getDoc(doc(db("student"), "applications", applicationId))).get("status"), "reviewed");
});
test("regras rejeitam vaga de estudante, autoria forjada e campos excessivos", async () => {
  await registration("student"); await registration("company", "empresa");
  await env.withSecurityRulesDisabled(async context => updateDoc(doc(context.firestore(), "users", "company"), { companyStatus: "verified" }));
  const base = { empresaId: "company", empresaNome: "Empresa Demonstração", titulo: "Vaga", descricao: "Descrição", requisitos: "Requisitos", modalidade: "Remoto", local: "Brasil", status: "aberta", createdAt: serverTimestamp() };
  await assertFails(setDoc(doc(db("student"), "vagas", "forged"), base));
  await assertFails(setDoc(doc(db("company"), "vagas", "wrong-name"), { ...base, empresaNome: "Outra empresa" }));
  await assertFails(setDoc(doc(db("company"), "vagas", "large-title"), { ...base, titulo: "x".repeat(161) }));
  await assertFails(setDoc(doc(db("company"), "vagas", "extra"), { ...base, admin: true }));
});
