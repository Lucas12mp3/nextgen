const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const modules = new Map();
function load(path) {
  if (modules.has(path)) return modules.get(path);
  const exports = {}; modules.set(path, exports);
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInThisContext(`(function(exports, require) { ${source} })`)(exports, name => {
    if (name === './challenge-policy') return load('lib/challenge-policy.ts');
    throw new Error(`Unexpected module ${name}`);
  });
  return exports;
}
const policy = load('lib/challenge-policy.ts'), ranking = load('lib/challenge-ranking.ts');
const challenge = { scoringVersion: 2, nivel: 'iniciante', notaMinima: 60, perguntas: Array.from({ length: 3 }, () => ({ enunciado: 'Pergunta', opcoes: ['A', 'B'] })) };
const secret = { respostasCorretas: [0, 1, 0] };
const achievement = (userId, desafioId, nota = 100) => ({ id: `${userId}_${desafioId}`, userId, desafioId, nivel: 'iniciante', scoringVersion: 2, nota, pontos: nota });
test('remover alternativas vazias preserva a alternativa correta por índice', () => {
  const result = policy.normalizeQuestions([{ enunciado: 'Pergunta', opcoes: [' A ', '', 'B', 'C'], correta: 2 }]);
  assert.deepEqual(result[0], { enunciado: 'Pergunta', opcoes: ['A', 'B', 'C'], correta: 1 });
  assert.throws(() => policy.normalizeQuestions([{ enunciado: 'Teste', opcoes: ['A', '', 'B'], correta: 1 }]));
  assert.throws(() => policy.normalizeQuestions([{ enunciado: 'Teste', opcoes: ['Sim', ' sim '], correta: 0 }]));
});
test('nota e pontos são calculados pelo gabarito, com arredondamento definido', () => {
  assert.deepEqual(policy.gradeAnswers(challenge, secret, [0, 0, 0]), { nota: 67, acertos: 2, aprovado: true, pontos: 67 });
  assert.equal(policy.gradeAnswers({ ...challenge, nivel: 'intermediario' }, secret, [0, 0, 0]).pontos, 134);
  assert.equal(policy.gradeAnswers({ ...challenge, nivel: 'avancado' }, secret, [0, 1, 0]).pontos, 350);
});
test('reprovação não concede pontos e respostas fora das opções são recusadas', () => {
  assert.equal(policy.gradeAnswers({ ...challenge, notaMinima: 70 }, secret, [0, 0, 0]).pontos, 0);
  assert.throws(() => policy.gradeAnswers(challenge, secret, [0, 1]));
  assert.throws(() => policy.gradeAnswers(challenge, secret, [0, 9, 0]));
  assert.throws(() => policy.gradeAnswers(challenge, secret, [0, 0.5, 0]));
});
test('dados antigos, gabarito ausente e gabarito público não são aceitos', () => {
  assert.throws(() => policy.gradeAnswers({ ...challenge, scoringVersion: 1 }, secret, [0, 1, 0]));
  assert.throws(() => policy.gradeAnswers(challenge, {}, [0, 1, 0]));
  assert.throws(() => policy.gradeAnswers({ ...challenge, perguntas: challenge.perguntas.map(q => ({ ...q, correta: 0 })) }, secret, [0, 1, 0]));
});
test('ranking ignora duplicações, pontuação inválida e conquistas antigas', () => {
  const valid = achievement('alice', 'one');
  const result = ranking.aggregateRanking([valid, valid, achievement('alice', 'two', 75), { ...achievement('bob', 'one'), scoringVersion: 1 }, { ...achievement('bob', 'two'), pontos: 99999 }, { ...achievement('bob', 'three'), id: 'duplicate-custom-id' }]);
  assert.deepEqual(result, [{ userId: 'alice', totalPontos: 175, desafiosConcluidos: 2, melhorNota: 100 }]);
});
test('desempate do ranking é estável independentemente da ordem da consulta', () => {
  const input = [achievement('bob', 'one'), achievement('alice', 'one'), { ...achievement('carol', 'one', 50), nivel: 'intermediario', pontos: 100 }];
  assert.deepEqual(ranking.aggregateRanking(input).map(item => item.userId), ['alice', 'bob', 'carol']);
  assert.deepEqual(ranking.aggregateRanking(input.reverse()).map(item => item.userId), ['alice', 'bob', 'carol']);
});
