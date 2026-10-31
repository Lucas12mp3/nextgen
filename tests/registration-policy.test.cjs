const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const policy = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/registration-policy.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: policy });
const now = new Date('2026-10-30T12:00:00Z');
test('idade considera o dia do aniversário e rejeita datas inexistentes', () => {
  assert.equal(policy.ageFromDate('2010-10-30', now), 16);
  assert.equal(policy.ageFromDate('2010-10-31', now), 15);
  for (const date of ['2010-02-30', '2027-01-01', '', '2026-13-01']) assert.throws(() => policy.ageFromDate(date, now));
});
test('documentos têm comprimento, dígitos verificadores e rejeitam repetição', () => {
  assert.equal(policy.validDocument('529.982.247-25', 'cpf'), true);
  assert.equal(policy.validDocument('11.222.333/0001-81', 'cnpj'), true);
  assert.equal(policy.validDocument('11111111111', 'cpf'), false);
  assert.equal(policy.validDocument('52998224724', 'cpf'), false);
  assert.equal(policy.validDocument('11222333000182', 'cnpj'), false);
});
test('cadastro rejeita idade abaixo do mínimo e mantém dados normalizados', () => {
  assert.throws(() => policy.registrationData({ nome: 'Aluno', tipoConta: 'estudante', dataNascimento: '2010-10-31', cpf: '52998224725' }, now));
  const data = policy.registrationData({ nome: '  Aluno  ', tipoConta: 'estudante', dataNascimento: '2010-10-30', cpf: '529.982.247-25' }, now);
  assert.equal(data.nome, 'Aluno'); assert.equal(data.cpf, '52998224725'); assert.equal(data.cnpj, null);
  assert.equal(data.birthDate.toISOString(), '2010-10-30T00:00:00.000Z');
});
