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
