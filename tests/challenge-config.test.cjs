const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
const source = ts.transpileModule(readFileSync('server/challenge-config.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInThisContext(`(function(exports, require) { ${source} })`)(exportsObject, name => name === 'server-only' ? {} : require(name));
const resolve = exportsObject.resolveChallengeConfig;
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const account = { project_id: 'demo-project', client_email: 'server@demo-project.iam.gserviceaccount.com', private_key: privateKey };
const jsonEnv = { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-project', FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(account) };

test('ausência de credenciais e JSON inválido são diagnosticados sem expor dados', () => {
  assert.equal(resolve({}).reason, 'missing-credentials');
  const invalid = resolve({ FIREBASE_SERVICE_ACCOUNT_JSON: '{invalid' });
  assert.equal(invalid.reason, 'invalid-json'); assert.equal(invalid.credentials, null);
});
test('um JSON completo é suficiente e fornece o project_id do servidor', () => {
  const result = resolve(jsonEnv);
  assert.equal(result.available, true); assert.equal(result.reason, 'ready');
  assert.equal(result.credentials.projectId, 'demo-project');
  assert.equal(result.credentials.clientEmail, account.client_email);
});
test('as três variáveis existentes continuam compatíveis com quebras de linha escapadas', () => {
  const result = resolve({ FIREBASE_PROJECT_ID: 'demo-project', FIREBASE_CLIENT_EMAIL: account.client_email, FIREBASE_PRIVATE_KEY: privateKey.replace(/\n/g, '\\n') });
  assert.equal(result.available, true); assert.equal(result.credentials.privateKey === privateKey.trim(), true);
});
test('projeto divergente, e-mail errado e chave inválida bloqueiam a ativação', () => {
  assert.equal(resolve({ ...jsonEnv, NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'other-project' }).reason, 'project-mismatch');
  assert.equal(resolve({ ...jsonEnv, FIREBASE_PROJECT_ID: 'other-project' }).reason, 'project-mismatch');
  assert.equal(resolve({ FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ ...account, client_email: 'person@example.com' }) }).reason, 'invalid-email');
  const invalid = resolve({ FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ ...account, private_key: 'invalid-key' }) });
  assert.equal(invalid.reason, 'invalid-private-key'); assert.equal(invalid.credentials, null);
});
test('JSON entre aspas e chave entre aspas são normalizados', () => {
  assert.equal(resolve({ FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(JSON.stringify(account)) }).available, true);
  assert.equal(resolve({ FIREBASE_PROJECT_ID: 'demo-project', FIREBASE_CLIENT_EMAIL: account.client_email, FIREBASE_PRIVATE_KEY: JSON.stringify(privateKey) }).available, true);
});
