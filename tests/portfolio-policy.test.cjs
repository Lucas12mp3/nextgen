/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInThisContext(`(function(exports) { ${code} })`)(exports);
  return exports;
}
const policy = load('lib/student-portfolio.ts');
const matching = load('lib/job-recommendations.ts');
const job = { id: 'job', empresaId: 'company', empresaNome: 'Empresa', titulo: 'Aprendiz', descricao: 'Aprendizado supervisionado', requisitos: 'React, JavaScript e CSS', area: 'Tecnologia', status: 'aberta' };
const project = { nome: 'NextGen', descricao: 'Rede profissional', tecnologias: 'TypeScript', link: 'https://example.com' };
const course = { id: '0', curso: 'Desenvolvimento de Sistemas', instituicao: 'Escola', inicio: '2024-02', conclusao: '2026-12', situacao: 'cursando' };
test('projeção do perfil não transporta documentos, contato privado ou currículo', () => {
  const result = policy.publicStudent('student', { tipoConta: 'estudante', nome: 'Ana', cpf: 'private', email: 'private', dataNascimento: 'private', resumeUrl: 'private', skills: ['React', 123], github: 'javascript:alert(1)' });
  assert.deepEqual(Object.keys(result).sort(), ['uid', 'nome', 'titulo', 'instituicao', 'descricao', 'github', 'linkedin', 'portfolio', 'skills'].sort());
  assert.deepEqual(result.skills, ['React']); assert.equal(result.github, '');
  assert.equal(policy.publicStudent('company', { tipoConta: 'empresa' }), null);
});
test('links de projetos rejeitam esquemas executáveis e credenciais', () => {
  assert.equal(policy.projectData(project).link, 'https://example.com');
  for (const link of ['javascript:alert(1)', 'data:text/html,test', 'http://example.com', 'https://user:password@example.com', 'arquivo']) assert.throws(() => policy.projectData({ ...project, link }));
  assert.equal(policy.safeExternalUrl('javascript:alert(1)'), '');
});
test('formação valida período e conclusão obrigatória para curso concluído', () => {
  assert.equal(policy.educationData(course).curso, course.curso);
  for (const change of [{ inicio: '2024-13' }, { conclusao: '2023-01' }, { conclusao: '', situacao: 'concluido' }, { situacao: 'inventado' }]) assert.throws(() => policy.educationData({ ...course, ...change }));
});
test('sugestões explicam habilidades, cursos e tecnologias dos projetos', () => {
  const results = matching.recommendJobs([job], ['react'], [course], [{ id: '0', ...project, tecnologias: 'JavaScript' }]);
  assert.equal(results.length, 1);
  assert.match(results[0].reasons.join(' '), /react/);
  assert.match(results[0].reasons.join(' '), /projetos.*JavaScript/);
  assert.match(results[0].reasons.join(' '), /Desenvolvimento de Sistemas/);
});
test('aliases e acentuação são tratados sem confundir C com C++ ou CSS com SCSS', () => {
  assert.equal(matching.recommendJobs([job], ['JS'], [], []).length, 1);
  assert.equal(matching.recommendJobs([{ ...job, requisitos: 'C++ e SCSS', area: '', descricao: '', titulo: '' }], ['C', 'CSS'], [], []).length, 0);
  assert.equal(matching.recommendJobs([{ ...job, requisitos: 'COMUNICAÇÃO', area: '' }], ['comunicacao'], [], []).length, 1);
});
test('vagas fechadas e perfis sem correspondências não recebem sugestão inventada', () => {
  assert.equal(matching.recommendJobs([{ ...job, status: 'fechada' }], ['React'], [course], []).length, 0);
  assert.equal(matching.recommendJobs([job], [], [], []).length, 0);
  assert.equal(matching.recommendJobs([job], ['Enfermagem'], [], []).length, 0);
  assert.equal(matching.recommendJobs([job], [], [{ ...course, situacao: 'trancado' }], []).length, 0);
});
test('desempates são estáveis e vagas antigas sem área continuam compatíveis por habilidade', () => {
  const results = matching.recommendJobs([{ ...job, id: 'b', area: undefined }, { ...job, id: 'a', area: undefined }], ['React'], [], []);
  assert.deepEqual(results.map(x => x.job.id), ['a', 'b']);
});
test('repetir habilidade ou alias no perfil e em projetos não aumenta a compatibilidade', () => {
  const once = matching.recommendJobs([job], ['JavaScript'], [], [])[0];
  const repeated = matching.recommendJobs([job], ['JavaScript', 'JS', 'javascript'], [], [{ ...project, id: '0', tecnologias: 'JS, JavaScript' }])[0];
  assert.equal(repeated.score, once.score);
});
