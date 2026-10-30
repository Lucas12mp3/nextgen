const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function fixture(overrides = {}, currentUid = 'student') {
  const records = {
    'users/student': { tipoConta: 'estudante', nome: 'Student name' },
    'users/company': { tipoConta: 'empresa', companyStatus: 'verified', nome: 'Company name' },
    'vagas/job': { empresaId: 'company', empresaNome: 'Company name', titulo: 'Real job', status: 'aberta' },
    ...overrides,
  };
  const writes = [];
  const firestore = {
    doc: (_, ...parts) => ({ path: parts.join('/'), id: parts.at(-1) }),
    serverTimestamp: () => 'SERVER_TIME',
    runTransaction: async (_, work) => work({
      get: async ref => ({ id: ref.id, exists: () => !!records[ref.path], get: key => records[ref.path]?.[key] }),
      set: (ref, data) => writes.push({ path: ref.path, data }),
    }),
  };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('services/applications.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports: module.exports, require: name => {
    if (name === 'firebase/firestore') return firestore;
    if (name === '@/firebase/config') return { auth: { currentUser: currentUid ? { uid: currentUid } : null }, db: {} };
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return { send: module.exports.sendApplication, writes };
}

test('candidatura usa nome e vaga do banco e registra acesso ao currículo', async () => {
  const { send, writes } = fixture();
  assert.equal(await send({ fromUserId: 'student', vagaId: 'job', toCompanyId: 'forged', role: 'forged', fromUserName: 'forged' }), 'student_job');
  assert.equal(writes[0].data.fromUserName, 'Student name');
  assert.equal(writes[0].data.toCompanyId, 'company');
  assert.equal(writes[0].data.role, 'Real job');
  assert.equal(writes[0].data.status, 'pending');
  assert.equal(writes[1].path, 'resumeAccess/student/companies/company');
  assert.equal(writes[1].data.applicationId, 'student_job');
});

for (const [label, overrides] of [
  ['vaga fechada', { 'vagas/job': { empresaId: 'company', status: 'fechada' } }],
  ['empresa pendente', { 'users/company': { companyStatus: 'pending' } }],
  ['conta de empresa', { 'users/student': { tipoConta: 'empresa' } }],
  ['vaga removida', { 'vagas/job': null }],
]) test(`recusa ${label} sem gravar candidatura`, async () => {
  const { send, writes } = fixture(overrides);
  await assert.rejects(send({ fromUserId: 'student', vagaId: 'job' }));
  assert.equal(writes.length, 0);
});

test('recusa sessão ausente ou identidade forjada', async () => {
  await assert.rejects(fixture({}, null).send({ fromUserId: 'student', vagaId: 'job' }));
  await assert.rejects(fixture().send({ fromUserId: 'other', vagaId: 'job' }));
});
