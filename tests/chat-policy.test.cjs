const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const policy = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/chat-policy.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: policy });
const student = { uid: 'alice', tipoConta: 'estudante' };
const otherStudent = { uid: 'bob', tipoConta: 'estudante' };
const company = { uid: 'company', tipoConta: 'empresa', companyStatus: 'verified' };
const time = ms => ({ toMillis: () => ms });
const chat = { members: ['alice', 'bob'], status: 'accepted', blockedBy: [], lastSenderId: 'alice', updatedAt: time(200), readAt: { alice: time(200), bob: time(100) } };

test('o mesmo par de contas sempre abre a mesma conversa', () => {
  assert.equal(policy.conversationId('alice', 'bob'), policy.conversationId('bob', 'alice'));
  for (const pair of [['alice', 'alice'], ['', 'bob'], ['a|b', 'c'], ['a/b', 'c']]) assert.throws(() => policy.conversationId(...pair));
});
test('contato exige estudante com estudante ou empresa aprovada', () => {
  assert.equal(policy.canContact(student, otherStudent), true);
  assert.equal(policy.canContact(company, student), true);
  assert.equal(policy.canContact(student, company), true);
  assert.equal(policy.canContact(student, { ...company, companyStatus: 'pending' }), false);
  assert.equal(policy.canContact(company, { ...company, uid: 'company2' }), false);
  assert.equal(policy.canContact(student, student), false);
});
test('ninguém envia antes do aceite, depois de recusa ou após um bloqueio', () => {
  assert.equal(policy.canSend(chat, 'alice'), true);
  assert.equal(policy.canSend(chat, 'outsider'), false);
  for (const status of ['pending', 'declined']) assert.equal(policy.canSend({ ...chat, status }, 'alice'), false);
  for (const blockedBy of [['alice'], ['bob'], ['alice', 'bob']]) assert.equal(policy.canSend({ ...chat, blockedBy }, 'alice'), false);
});
test('não lidas compara a última atividade com a leitura do destinatário', () => {
  assert.equal(policy.isUnread(chat, 'bob'), true);
  assert.equal(policy.isUnread(chat, 'alice'), false);
  assert.equal(policy.isUnread({ ...chat, readAt: { ...chat.readAt, bob: time(200) } }, 'bob'), false);
  assert.equal(policy.isUnread({ ...chat, blockedBy: ['bob'] }, 'bob'), false);
  assert.equal(policy.isUnread(chat, 'outsider'), false);
});
test('texto vazio e limites de mensagem ou apresentação são validados', () => {
  assert.equal(policy.chatText('  Olá!  '), 'Olá!');
  assert.throws(() => policy.chatText('   '));
  assert.throws(() => policy.chatText('x'.repeat(2001)));
  assert.throws(() => policy.chatText('x'.repeat(501), 500));
});
