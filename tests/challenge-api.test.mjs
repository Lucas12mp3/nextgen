import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import { getApps, deleteApp } from "firebase-admin/app";
import { initializeTestEnvironment, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import * as clientSDK from "firebase/firestore";

process.env.NODE_ENV = "test";
process.env.FIREBASE_PROJECT_ID = "demo-nextgen-chat";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8089";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9098";
const require = createRequire(import.meta.url), modules = new Map();
function load(path) {
  if (modules.has(path)) return modules.get(path);
  const exports = {}; modules.set(path, exports);
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInThisContext(`(function(exports, require) { ${code} })`)(exports, name => {
    if (name === "server-only") return {};
    if (name.startsWith("@/")) return load(name.slice(2) + ".ts");
    if (name.startsWith("./")) return load(path.slice(0, path.lastIndexOf("/") + 1) + name.slice(2) + ".ts");
    return require(name);
  });
  return exports;
}
const routes = () => ({ create: load("app/api/desafios/route.ts"), submit: load("app/api/desafios/tentativa/route.ts"), close: load("app/api/desafios/fechar/route.ts") });
function client(actor) {
  const exports = {};
  const code = ts.transpileModule(readFileSync("services/desafios.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInThisContext(`(function(exports, require, fetch) { ${code} })`)(exports, name => {
    if (name === "firebase/firestore") return clientSDK;
    if (name === "@/firebase/config") return { auth: { currentUser: { uid: actor.uid, getIdToken: async () => actor.token } }, db: env.authenticatedContext(actor.uid).firestore() };
    if (name.startsWith("@/lib/")) return load(name.slice(2) + ".ts");
    throw new Error(`Unexpected client import ${name}`);
  }, async (path, options) => {
    const route = path.endsWith("/tentativa") ? routes().submit : path.endsWith("/fechar") ? routes().close : routes().create;
    return route.POST(new Request("http://localhost:3000" + path, options));
  });
  return exports;
}
let env, admin, company, student, other, pending;
async function user(email) {
  const response = await fetch("http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "test-only-password", returnSecureToken: true }) });
  const data = await response.json();
  assert.equal(response.status, 200);
  return { uid: data.localId, token: data.idToken };
}
const payload = () => ({ requestId: randomUUID(), titulo: "Lógica para iniciantes", descricao: "Demonstre seus conhecimentos de lógica.", area: "Tecnologia", nivel: "iniciante", notaMinima: 60,
  perguntas: [{ enunciado: "Quanto é 2 + 2?", opcoes: ["3", "", "4", "5"], correta: 2 }, { enunciado: "Qual número é par?", opcoes: ["3", "8"], correta: 1 }] });
async function post(route, actor, body, headers = {}) {
  return route.POST(new Request("http://localhost:3000/api/desafios", { method: "POST", headers: { "content-type": "application/json", ...(actor ? { authorization: `Bearer ${actor.token}` } : {}), ...headers }, body: JSON.stringify(body) }));
}
async function publish() {
  const data = payload(), response = await post(routes().create, company, data);
  assert.equal(response.status, 200, await response.clone().text());
  return (await response.json()).id;
}
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-nextgen-chat", firestore: { host: "127.0.0.1", port: 8089, rules: readFileSync("firebase/firestore.rules", "utf8") } });
  await fetch("http://127.0.0.1:9098/emulator/v1/projects/demo-nextgen-chat/accounts", { method: "DELETE" });
  company = await user("company@example.test"); student = await user("student@example.test"); other = await user("other@example.test"); pending = await user("pending@example.test");
  admin = load("server/firebase-admin.ts").adminServices();
});
beforeEach(async () => {
  await env.clearFirestore();
  for (const [actor, type, status] of [[company, "empresa", "verified"], [pending, "empresa", "pending"], [student, "estudante", null], [other, "estudante", null]]) await admin.db.doc(`users/${actor.uid}`).set({ nome: actor === company ? "Empresa Demo" : "Demo", tipoConta: type, ...(status ? { companyStatus: status } : {}) });
});
after(async () => { await env?.cleanup(); for (const app of getApps()) await deleteApp(app); });

test("API exige token válido, origem correta e empresa aprovada", async () => {
  assert.equal((await post(routes().create, null, payload())).status, 401);
  assert.equal((await post(routes().create, { token: "invalid-token" }, payload())).status, 401);
  assert.equal((await post(routes().create, company, payload(), { origin: "https://other.example" })).status, 403);
  assert.equal((await post(routes().create, student, payload())).status, 403);
  assert.equal((await post(routes().create, pending, payload())).status, 403);
});
test("publicação separa gabarito, normaliza alternativas e é idempotente", async () => {
  const data = { ...payload(), empresaId: student.uid, empresaNome: "forjada", pontos: 99999 };
  const response = await post(routes().create, company, data), id = (await response.json()).id;
  assert.equal(response.status, 200);
  const challenge = (await admin.db.doc(`desafios/${id}`).get()).data();
  assert.equal(challenge.empresaId, company.uid); assert.equal(challenge.empresaNome, "Empresa Demo"); assert.equal(challenge.pontos, 100);
  assert.deepEqual(challenge.perguntas[0].opcoes, ["3", "4", "5"]); assert.equal(challenge.perguntas[0].correta, undefined);
  assert.deepEqual((await admin.db.doc(`desafioSegredos/${id}`).get()).get("respostasCorretas"), [1, 1]);
  assert.equal((await post(routes().create, company, data)).status, 200);
  assert.equal((await admin.db.collection("desafios").get()).size, 1);
  assert.equal((await post(routes().create, company, payload())).status, 429);
  const client = env.authenticatedContext(student.uid).firestore();
  await assertFails(getDoc(doc(client, "desafioSegredos", id)));
});
test("servidor corrige, persiste e não duplica pontos em envios concorrentes", async () => {
  const id = await publish();
  const responses = await Promise.all([post(routes().submit, student, { desafioId: id, respostas: [1, 1] }), post(routes().submit, student, { desafioId: id, respostas: [1, 1] })]);
  for (const response of responses) { assert.equal(response.status, 200); const data = await response.json(); assert.equal(data.nota, 100); assert.equal(data.pontos, 100); assert.equal(data.respostasCorretas, undefined); }
  assert.equal((await admin.db.collection("conquistas").get()).size, 1);
  assert.equal((await admin.db.collection("desafioTentativas").get()).size, 1);
  const client = env.authenticatedContext(student.uid).firestore();
  await assertFails(setDoc(doc(client, "conquistas", `${student.uid}_${id}`), { nota: 100, pontos: 9999 }));
  await assertFails(getDoc(doc(env.authenticatedContext(other.uid).firestore(), "desafioTentativas", `${student.uid}_${id}`)));
});
test("reprovação fica registrada e novas respostas retornam o resultado original", async () => {
  const id = await publish();
  const first = await post(routes().submit, student, { desafioId: id, respostas: [0, 0] });
  assert.deepEqual(await first.json(), { nota: 0, acertos: 0, aprovado: false, pontos: 0, duplicated: false });
  const repeated = await post(routes().submit, student, { desafioId: id, respostas: [1, 1] });
  assert.equal((await repeated.json()).nota, 0);
  assert.equal((await admin.db.collection("conquistas").get()).size, 0);
  const own = await routes().submit.GET(new Request(`http://localhost:3000/api/desafios/tentativa?id=${id}`, { headers: { authorization: `Bearer ${student.token}` } }));
  assert.equal((await own.json()).result.nota, 0);
  const stranger = await routes().submit.GET(new Request(`http://localhost:3000/api/desafios/tentativa?id=${id}`, { headers: { authorization: `Bearer ${other.token}` } }));
  assert.equal((await stranger.json()).result, null);
});
test("alternativas inválidas, notas forjadas e gabaritos malformados são recusados", async () => {
  const id = await publish();
  assert.equal((await post(routes().submit, student, { desafioId: id, respostas: [20, 1] })).status, 400);
  assert.equal((await post(routes().submit, student, { desafioId: id, respostas: [1] })).status, 400);
  assert.equal((await post(routes().submit, student, { desafioId: id, respostas: [1, 1], nota: 100 })).status, 400);
  assert.equal((await admin.db.collection("desafioTentativas").get()).size, 0);
  assert.equal((await post(routes().create, company, { ...payload(), notaMinima: 0 })).status, 400);
  assert.equal((await post(routes().create, company, { ...payload(), perguntas: [{ enunciado: "Teste", opcoes: ["Sim", ""], correta: 1 }] })).status, 400);
});
test("fechamento verifica propriedade; resultados anteriores continuam disponíveis", async () => {
  const id = await publish();
  await post(routes().submit, student, { desafioId: id, respostas: [1, 1] });
  await admin.db.doc(`users/${pending.uid}`).update({ companyStatus: "verified" });
  assert.equal((await post(routes().close, pending, { desafioId: id })).status, 403);
  assert.equal((await post(routes().close, company, { desafioId: id })).status, 200);
  assert.equal((await post(routes().submit, other, { desafioId: id, respostas: [1, 1] })).status, 409);
  assert.equal((await post(routes().submit, student, { desafioId: id, respostas: [0, 0] })).status, 200);
});
test("aprovação revogada, conta desativada e desafios antigos são protegidos", async () => {
  const id = await publish();
  await admin.db.doc(`users/${company.uid}`).update({ companyStatus: "pending" });
  assert.equal((await post(routes().submit, student, { desafioId: id, respostas: [1, 1] })).status, 403);
  await admin.db.doc(`users/${company.uid}`).update({ companyStatus: "verified" });
  await admin.db.doc(`desafios/${id}`).update({ scoringVersion: 1 });
  assert.equal((await post(routes().submit, student, { desafioId: id, respostas: [1, 1] })).status, 409);
  await admin.auth.updateUser(student.uid, { disabled: true });
  try { assert.equal((await post(routes().submit, student, { desafioId: id, respostas: [1, 1] })).status, 401); }
  finally { await admin.auth.updateUser(student.uid, { disabled: false }); }
});
test("serviços do navegador publicam, listam, respondem, recuperam e fecham via API", async () => {
  const companyClient = client(company), studentClient = client(student);
  const id = await companyClient.criarDesafio({ ...payload(), empresaId: company.uid });
  assert.equal((await studentClient.getDesafio(id)).titulo, "Lógica para iniciantes");
  assert.equal(await studentClient.getResultado(id), null);
  const listed = await new Promise((resolve, reject) => {
    const stop = studentClient.subscribeDesafiosAbertos(items => { stop(); resolve(items); }, reject);
  });
  assert.equal(listed.length, 1);
  const result = await studentClient.enviarTentativa(id, [1, 1]);
  assert.equal(result.nota, 100);
  assert.equal((await studentClient.getResultado(id)).nota, 100);
  await admin.db.doc("conquistas/legacy-score").set({ userId: student.uid, desafioId: "old", nota: 100, pontos: 50000 });
  const ranking = await new Promise((resolve, reject) => {
    const stop = studentClient.subscribeRankingGeral(items => { stop(); resolve(items); }, reject);
  });
  assert.equal(ranking.length, 1); assert.equal(ranking[0].totalPontos, 100); assert.equal(ranking[0].desafiosConcluidos, 1);
  const achievements = await new Promise((resolve, reject) => {
    const stop = studentClient.subscribeConquistas(student.uid, items => { stop(); resolve(items); }, reject);
  });
  assert.equal(achievements.length, 1);
  await companyClient.fecharDesafio(id);
  assert.equal((await studentClient.getDesafio(id)).status, "fechado");
});
test("dados antigos sem correção verificada não são expostos ao navegador", async () => {
  await admin.db.doc("desafios/legacy").set({ titulo: "Antigo", perguntas: [{ correta: 0 }], status: "aberto" });
  await admin.db.doc("conquistas/legacy").set({ userId: student.uid, nota: 100, pontos: 90000 });
  const store = env.authenticatedContext(student.uid).firestore();
  await assertFails(getDoc(doc(store, "desafios", "legacy")));
  await assertFails(getDoc(doc(store, "conquistas", "legacy")));
});
