import { beforeEach, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React, { act } from "react";
import * as jsx from "react/jsx-runtime";
import { JSDOM } from "jsdom";

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://nextgen.example/login' });
for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Event', 'MouseEvent']) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
let container, root, listeners, auth, profiles, readProfile, signIn, router, modules, subscriptions;
const user = uid => ({ uid });
const snapshot = data => ({ exists: () => !!data, get: key => data?.[key] });
function emit(current) { auth.currentUser = current; for (const listener of [...listeners]) listener(current); }
function defer() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function load(path) {
  if (modules.has(path)) return modules.get(path);
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInThisContext(`(function(exports, require) { ${compiled} })`)(exports, name => {
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return jsx;
    if (name === 'next/navigation') return { useRouter: () => router };
    if (name === 'next/link') return { default: props => React.createElement('a', props, props.children) };
    if (name === '@/components/BrandLogo') return { default: () => React.createElement('span', null, 'NextGen') };
    if (name === '@/firebase/config') return { auth, db: {} };
    if (name === 'firebase/auth') return { onAuthStateChanged: (_auth, listener) => {
      listeners.add(listener); queueMicrotask(() => { if (listeners.has(listener)) listener(auth.currentUser); });
      return () => listeners.delete(listener);
    } };
    if (name === 'firebase/firestore') return { doc: (_db, _collection, id) => id, getDoc: id => readProfile(id) };
    if (name === '@/services/autenticar') return { entrar: (...args) => signIn(...args), sair: async () => emit(null) };
    if (name === '@/services/auth-errors') return load('services/auth-errors.ts');
    if (name === '@/services/chat-policy') return load('services/chat-policy.ts');
    if (name === '@/services/social') return { heartbeat: async () => {}, subscribeChatStatus: (uid, update) => {
      const sub = { uid, active: true }; subscriptions.push(sub);
      queueMicrotask(() => { if (sub.active) update({ showOnline: false, readReceipts: true, lastActiveAt: null }); });
      return () => { sub.active = false; };
    } };
    throw new Error(`Unexpected module ${name}`);
  });
  modules.set(path, exports); return exports;
}
async function mount(children) {
  const Provider = load('components/chat/ChatActivityProvider.tsx').default;
  await act(async () => root.render(React.createElement(Provider, null, children)));
}
async function mountLogin() { const Login = load('app/(auth)/login/page.tsx').default; await mount(React.createElement(Login)); }
beforeEach(() => {
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  listeners = new Set(); auth = { currentUser: null }; profiles = new Map([['student', { tipoConta: 'estudante' }], ['company', { tipoConta: 'empresa' }]]);
  readProfile = async id => snapshot(profiles.get(id));
  signIn = async () => { emit(user('student')); return auth.currentUser; };
  router = { destinations: [], replace(path) { this.destinations.push(path); } };
  modules = new Map(); subscriptions = [];
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test('mudanças de autenticação preservam a página e o estado do formulário', async () => {
  let mounts = 0, unmounts = 0;
  const { useChatActivity } = load('components/chat/ChatActivityProvider.tsx');
  function Page() {
    const [value, setValue] = React.useState(0);
    const activity = useChatActivity();
    React.useEffect(() => { mounts++; return () => { unmounts++; }; }, []);
    return React.createElement('button', { onClick: () => setValue(v => v + 1) }, `${value}:${activity.userId || 'guest'}`);
  }
  await mount(React.createElement(Page));
  await act(async () => container.querySelector('button').click());
  for (const current of [user('student'), user('company'), null]) {
    await act(async () => emit(current));
    assert.equal(container.textContent, `1:${current?.uid || 'guest'}`);
    assert.equal(mounts, 1); assert.equal(unmounts, 0);
  }
  assert.equal(subscriptions.filter(s => s.active).length, 0);
});

test('login navega após autenticar mesmo com leitura do perfil pendente', async () => {
  const waiting = defer(); readProfile = () => waiting.promise;
  await mountLogin();
  assert.ok(container.querySelector('form'));
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.match(container.textContent, /Acessando sua conta/);
  assert.equal(container.querySelector('form'), null);
  await act(async () => waiting.resolve(snapshot({ tipoConta: 'estudante' })));
  assert.deepEqual(router.destinations, ['/perfils/estudante']);
});

test('sessão existente abre o painel da empresa sem pedir login novamente', async () => {
  auth.currentUser = user('company');
  await mountLogin();
  assert.deepEqual(router.destinations, ['/perfils/empresa']);
  assert.equal(container.querySelector('form'), null);
});

test('senha incorreta mantém o formulário e apresenta o erro sem navegar', async () => {
  signIn = async () => { throw { code: 'auth/invalid-credential' }; };
  await mountLogin();
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.match(container.querySelector('[role="alert"]').textContent, /E-mail ou senha incorretos/);
  assert.ok(container.querySelector('form')); assert.deepEqual(router.destinations, []);
});

test('falha ao carregar perfil mantém a sessão e permite tentar novamente', async () => {
  auth.currentUser = user('student');
  readProfile = async () => { throw { code: 'unavailable' }; };
  await mountLogin();
  assert.match(container.querySelector('[role="alert"]').textContent, /indisponível/);
  assert.equal(container.querySelector('form'), null);
  readProfile = async () => snapshot({ tipoConta: 'estudante' });
  await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent === 'Verificar novamente').click());
  assert.deepEqual(router.destinations, ['/perfils/estudante']);
});

test('perfil ausente não é confundido com estudante e oferece saída da conta', async () => {
  auth.currentUser = user('missing');
  await mountLogin();
  assert.match(container.querySelector('[role="alert"]').textContent, /perfil não foi encontrado/);
  assert.deepEqual(router.destinations, []);
  await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent === 'Entrar com outra conta').click());
  assert.ok(container.querySelector('form'));
});

test('resposta de uma sessão anterior não redireciona a conta atual', async () => {
  const old = defer();
  auth.currentUser = user('student');
  readProfile = async id => id === 'student' ? old.promise : snapshot(profiles.get(id));
  await mountLogin();
  await act(async () => emit(user('company')));
  await act(async () => old.resolve(snapshot({ tipoConta: 'estudante' })));
  assert.deepEqual(router.destinations, ['/perfils/empresa']);
});

test('perfil que demora demais libera nova tentativa e ignora resposta atrasada', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const waiting = defer();
  auth.currentUser = user('student'); readProfile = () => waiting.promise;
  await mountLogin();
  await act(async () => t.mock.timers.tick(12000));
  assert.match(container.querySelector('[role="alert"]').textContent, /demorou para carregar/);
  await act(async () => waiting.resolve(snapshot({ tipoConta: 'estudante' })));
  assert.deepEqual(router.destinations, []);
  readProfile = async () => snapshot({ tipoConta: 'estudante' });
  await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent === 'Verificar novamente').click());
  assert.deepEqual(router.destinations, ['/perfils/estudante']);
});
