import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as sdk from "firebase/firestore";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
let env;
const db = uid => env.authenticatedContext(uid).firestore();
const compile = path => ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function service(path, uid) {
  const exports = {};
  vm.runInThisContext(`(function(exports, require) { ${compile(path)} })`)(exports, name => {
    if (name === 'firebase/firestore') return sdk;
    if (name === '@/firebase/config') return { auth: { currentUser: { uid } }, db: db(uid) };
    if (name === '@/lib/student-portfolio') { const p = {}; vm.runInThisContext(`(function(exports) { ${compile('lib/student-portfolio.ts')} })`)(p); return p; }
    throw new Error(`Unexpected module ${name}`);
  });
  return exports;
}
const project = { nome: 'TCC', descricao: 'Projeto escolar colaborativo', tecnologias: 'React, TypeScript', link: 'https://example.com' };
const education = { curso: 'Desenvolvimento de Sistemas', instituicao: 'Escola', inicio: '2024-02', conclusao: '2026-12', situacao: 'cursando' };
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-nextgen-chat', firestore: { host: '127.0.0.1', port: 8089, rules: readFileSync('firebase/firestore.rules', 'utf8') } }); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    for (const [uid, profile] of Object.entries({ alice: { nome: 'Ana', tipoConta: 'estudante' }, bob: { nome: 'Bruno', tipoConta: 'estudante' }, company: { nome: 'Empresa', tipoConta: 'empresa', companyStatus: 'verified' } })) await setDoc(doc(context.firestore(), 'users', uid), profile);
    await setDoc(doc(context.firestore(), 'admins', 'admin'), { nome: 'Admin' });
    await setDoc(doc(context.firestore(), 'users', 'alice', 'privado', 'dados'), { cpf: 'private' });
  });
});
after(async () => { await env?.cleanup(); });
test('estudante cria, edita e remove projetos e formação pelos serviços reais', async () => {
  const portfolio = service('services/student-portfolio.ts', 'alice');
  await assertSucceeds(portfolio.saveProject('alice', '0', project));
  await assertSucceeds(portfolio.saveProject('alice', '0', { ...project, nome: 'TCC atualizado' }));
  await assertSucceeds(portfolio.saveEducation('alice', '0', education));
  assert.equal((await getDoc(doc(db('alice'), 'users', 'alice', 'projetos', '0'))).get('nome'), 'TCC atualizado');
  await assertSucceeds(portfolio.removePortfolioRecord('alice', 'projetos', '0'));
  await assertSucceeds(portfolio.removePortfolioRecord('alice', 'formacoes', '0'));
});
test('empresa e colegas consultam apresentação sem ler dados privados ou editar outro perfil', async () => {
  await service('services/student-portfolio.ts', 'alice').saveProject('alice', '0', project);
  const target = store => doc(store, 'users', 'alice', 'projetos', '0');
  await assertSucceeds(getDoc(target(db('company'))));
  await assertSucceeds(getDocs(collection(db('bob'), 'users', 'alice', 'projetos')));
  await assertFails(getDoc(target(env.unauthenticatedContext().firestore())));
  await assertFails(updateDoc(target(db('bob')), { nome: 'forjado', atualizadoEm: serverTimestamp() }));
  await assertFails(deleteDoc(target(db('company'))));
  await assertFails(getDoc(doc(db('company'), 'users', 'alice', 'privado', 'dados')));
  await assertFails(setDoc(doc(db('company'), 'users', 'company', 'projetos', '0'), { ...project, atualizadoEm: serverTimestamp() }));
});
test('regras limitam registros, campos, links e datas mesmo sem o formulário', async () => {
  const p = doc(db('alice'), 'users', 'alice', 'projetos', '0');
  for (const change of [{ cpf: 'private' }, { link: 'javascript:alert(1)' }, { descricao: 'x'.repeat(2001) }]) await assertFails(setDoc(p, { ...project, atualizadoEm: serverTimestamp(), ...change }));
  await assertFails(setDoc(doc(db('alice'), 'users', 'alice', 'projetos', '10'), { ...project, atualizadoEm: serverTimestamp() }));
  for (const change of [{ inicio: '2024-13' }, { conclusao: '2023-01' }, { conclusao: '', situacao: 'concluido' }, { tipoConta: 'empresa' }]) await assertFails(setDoc(doc(db('alice'), 'users', 'alice', 'formacoes', '0'), { ...education, atualizadoEm: serverTimestamp(), ...change }));
  await assertSucceeds(setDoc(doc(db('alice'), 'users', 'alice', 'formacoes', '0'), { ...education, atualizadoEm: serverTimestamp() }));
});
test('empresa publica área opcional e regras recusam área de tipo ou tamanho inválidos', async () => {
  const jobs = service('services/vagas.ts', 'company');
  const payload = { empresaId: 'company', empresaNome: 'Empresa', titulo: 'Aprendiz em desenvolvimento', descricao: 'Aprendizado supervisionado.', requisitos: 'Interesse em React e JavaScript.', modalidade: 'Remoto', local: 'Blumenau, SC', status: 'aberta', area: 'Tecnologia' };
  const id = await jobs.criarVaga(payload);
  const saved = (await getDoc(doc(db('company'), 'vagas', id))).data();
  assert.equal(saved.area, 'Tecnologia');
  for (const area of [42, 'x'.repeat(121)]) await assertFails(setDoc(doc(db('company'), 'vagas', 'bad-area'), { ...saved, area, createdAt: serverTimestamp() }));
});
test('solicitação de privacidade é privada, não pode ser forjada nem duplicada em andamento', async () => {
  const privacy = service('services/privacy.ts', 'alice');
  await assertSucceeds(privacy.sendPrivacyRequest('exclusao', 'Gostaria de solicitar a exclusão dos meus dados.'));
  await assertSucceeds(getDoc(doc(db('alice'), 'privacyRequests', 'alice')));
  await assertFails(getDoc(doc(db('bob'), 'privacyRequests', 'alice')));
  await assertFails(getDocs(collection(db('alice'), 'privacyRequests')));
  await assertFails(updateDoc(doc(db('alice'), 'privacyRequests', 'alice'), { status: 'resolved', response: 'forjada' }));
  await assert.rejects(privacy.sendPrivacyRequest('ajuda', 'Outra solicitação não pode substituir a atual.'), /em andamento/);
  assert.ok((await getDoc(doc(db('alice'), 'users', 'alice'))).exists());
});
test('somente administrador responde e o titular acompanha, sem exclusão automática', async () => {
  const owner = service('services/privacy.ts', 'alice'), admin = service('services/privacy.ts', 'admin');
  await owner.sendPrivacyRequest('ajuda', 'Preciso entender como meu currículo é compartilhado.');
  const request = (await getDoc(doc(db('alice'), 'privacyRequests', 'alice'))).data();
  await assertSucceeds(getDocs(collection(db('admin'), 'privacyRequests')));
  await assertFails(service('services/privacy.ts', 'bob').answerPrivacyRequest('alice', request.generation, 'Resposta forjada', 'reviewed'));
  await assertSucceeds(admin.answerPrivacyRequest('alice', request.generation, 'O currículo é restrito ao fluxo de candidatura.', 'reviewed'));
  assert.equal((await getDoc(doc(db('alice'), 'privacyRequests', 'alice'))).get('response'), 'O currículo é restrito ao fluxo de candidatura.');
  await assertSucceeds(admin.answerPrivacyRequest('alice', request.generation, 'Orientação concluída com o titular.', 'resolved'));
  await owner.sendPrivacyRequest('correcao', 'Preciso corrigir uma informação do meu cadastro.');
  await assert.rejects(admin.answerPrivacyRequest('alice', request.generation, 'Resposta ao pedido anterior', 'resolved'), /mudou/);
  assert.equal((await getDoc(doc(db('alice'), 'privacyRequests', 'alice'))).get('kind'), 'correcao');
  assert.ok((await getDoc(doc(db('alice'), 'users', 'alice'))).exists());
});
