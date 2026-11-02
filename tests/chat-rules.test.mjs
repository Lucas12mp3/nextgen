import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as firestore from "firebase/firestore";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";

let env;
const id = "alice|bob";
const db = uid => env.authenticatedContext(uid).firestore();
const ref = (uid, chatId = id) => doc(db(uid), "conversations", chatId);
function service(userId, module = "chat") {
  const compile = path => ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const policy = {};
  vm.runInNewContext(compile("services/chat-policy.ts"), { exports: policy });
  const exports = {};
  vm.runInThisContext(`(function(exports, require) { ${compile(`services/${module}.ts`)} })`)(exports, name => {
    if (name === "firebase/firestore") return firestore;
    if (name === "@/firebase/config") return { auth: { currentUser: { uid: userId } }, db: db(userId) };
    if (name === "./chat-policy") return policy;
    throw new Error(`Unexpected module ${name}`);
  });
  return exports;
}
const request = (sender = "alice", members = ["alice", "bob"]) => ({ members, createdBy: sender, status: "pending", intro: "Olá, vamos conversar sobre nossos projetos?", blockedBy: [], readAt: Object.fromEntries(members.map(member => [member, member === sender ? serverTimestamp() : null])), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastMessageId: "", lastMessage: "Olá, vamos conversar sobre nossos projetos?", lastSenderId: sender });
async function create() { await setDoc(ref("alice"), request()); }
async function accept() { await create(); await updateDoc(ref("bob"), { status: "accepted" }); }
function send(sender = "alice", options = {}) {
  const store = db(sender), messageId = options.messageId || "m1";
  const batch = writeBatch(store);
  batch.set(doc(store, "conversations", id, "messages", messageId), { senderId: sender, text: "Uma mensagem de teste", createdAt: serverTimestamp(), ...options.message });
  batch.update(doc(store, "conversations", id), { lastMessageId: messageId, lastMessage: "Uma mensagem de teste", lastSenderId: sender, updatedAt: serverTimestamp(), [`readAt.${sender}`]: serverTimestamp(), ...options.chat });
  return batch.commit();
}

before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-nextgen-chat", firestore: { host: "127.0.0.1", port: 8089, rules: readFileSync("firebase/firestore.rules", "utf8") } });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    for (const [uid, data] of Object.entries({ alice: { nome: "Alice", tipoConta: "estudante" }, bob: { nome: "Bob", tipoConta: "estudante" }, outsider: { nome: "Other", tipoConta: "estudante" }, company: { nome: "Company", tipoConta: "empresa", companyStatus: "verified" }, pending: { nome: "Pending", tipoConta: "empresa", companyStatus: "pending" } })) await setDoc(doc(context.firestore(), "users", uid), data);
    await setDoc(doc(context.firestore(), "admins", "admin"), { nome: "Admin" });
  });
});
after(async () => { await env?.cleanup(); });

test("estudante cria solicitação; somente participantes leem e consultam a caixa", async () => {
  await assertSucceeds(create());
  await assertSucceeds(getDoc(ref("bob")));
  await assertFails(getDoc(ref("outsider")));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "conversations", id)));
  await assertSucceeds(getDocs(query(collection(db("alice"), "conversations"), where("members", "array-contains", "alice"))));
  await assertFails(getDocs(collection(db("outsider"), "conversations")));
});
test("recusa empresa pendente, empresa com empresa e participação forjada", async () => {
  await assertFails(setDoc(ref("pending", "alice|pending"), request("pending", ["alice", "pending"])));
  await assertFails(setDoc(ref("company", "company|pending"), request("company", ["company", "pending"])));
  await assertFails(setDoc(ref("outsider"), request("alice")));
  await assertSucceeds(setDoc(ref("company", "alice|company"), request("company", ["alice", "company"])));
});
test("só o destinatário pode aceitar e mensagens exigem aceite", async () => {
  await create();
  await assertFails(updateDoc(ref("alice"), { status: "accepted" }));
  await assertFails(send());
  await assertSucceeds(updateDoc(ref("bob"), { status: "accepted" }));
  await assertSucceeds(send());
  await assertSucceeds(getDocs(collection(db("bob"), "conversations", id, "messages")));
  await assertFails(getDoc(doc(db("outsider"), "conversations", id, "messages", "m1")));
});
test("solicitação recusada não pode ser reaberta ou substituída", async () => {
  await create(); await updateDoc(ref("bob"), { status: "declined" });
  await assertFails(updateDoc(ref("bob"), { status: "accepted" }));
  await assertFails(setDoc(ref("alice"), request()));
  await assertFails(deleteDoc(ref("alice")));
  await assertFails(setDoc(ref("alice", "bob|alice"), request("alice", ["bob", "alice"])));
});
test("bloqueio interrompe envios e ninguém pode remover o bloqueio do outro", async () => {
  await accept();
  await updateDoc(ref("bob"), { blockedBy: ["bob"] });
  await assertFails(send("alice")); await assertFails(send("bob"));
  await assertFails(updateDoc(ref("alice"), { blockedBy: [] }));
  await assertSucceeds(updateDoc(ref("alice"), { blockedBy: ["bob", "alice"] }));
  await assertSucceeds(updateDoc(ref("bob"), { blockedBy: ["alice"] }));
  await assertSucceeds(updateDoc(ref("alice"), { blockedBy: [] }));
  await assertSucceeds(send());
});
test("mensagem e prévia devem ser atômicas; autoria e histórico são imutáveis", async () => {
  await accept();
  await assertFails(setDoc(doc(db("alice"), "conversations", id, "messages", "lone"), { senderId: "alice", text: "isolada", createdAt: serverTimestamp() }));
  await assertFails(send("alice", { message: { senderId: "bob" } }));
  await assertFails(send("alice", { chat: { lastMessage: "prévia forjada" } }));
  await assertFails(send("alice", { message: { text: "x".repeat(2001) } }));
  await assertSucceeds(send());
  await assertFails(updateDoc(doc(db("alice"), "conversations", id, "messages", "m1"), { text: "editada" }));
  await assertFails(deleteDoc(doc(db("alice"), "conversations", id, "messages", "m1")));
  await assertFails(updateDoc(ref("alice"), { members: ["alice", "outsider"] }));
});
test("cada participante só confirma sua própria leitura", async () => {
  await accept(); await send();
  await assertSucceeds(updateDoc(ref("bob"), { "readAt.bob": serverTimestamp() }));
  await assertFails(updateDoc(ref("alice"), { "readAt.bob": serverTimestamp() }));
});
test("empresa perde direito de envio quando sua aprovação é retirada", async () => {
  const companyId = "alice|company";
  await setDoc(ref("company", companyId), request("company", ["alice", "company"]));
  await updateDoc(ref("alice", companyId), { status: "accepted" });
  await env.withSecurityRulesDisabled(async context => updateDoc(doc(context.firestore(), "users", "company"), { companyStatus: "pending" }));
  const store = db("company"), batch = writeBatch(store);
  batch.set(doc(store, "conversations", companyId, "messages", "m1"), { senderId: "company", text: "Mensagem", createdAt: serverTimestamp() });
  batch.update(doc(store, "conversations", companyId), { lastMessageId: "m1", lastMessage: "Mensagem", lastSenderId: "company", updatedAt: serverTimestamp(), "readAt.company": serverTimestamp() });
  await assertFails(batch.commit());
});
test("denúncia valida evidência e administrador recebe somente o relato", async () => {
  await accept(); await send();
  const report = { conversationId: id, reporterId: "bob", reportedId: "alice", reason: "Mensagem inadequada nesta conversa", status: "open", createdAt: serverTimestamp(), messageId: "m1", evidence: "Uma mensagem de teste" };
  await assertFails(setDoc(doc(db("bob"), "chatReports", `${id}_bob`), { ...report, evidence: "texto inventado" }));
  await assertSucceeds(setDoc(doc(db("bob"), "chatReports", `${id}_bob`), report));
  await assertSucceeds(getDoc(doc(db("admin"), "chatReports", `${id}_bob`)));
  await assertFails(getDoc(ref("admin")));
  await assertFails(getDoc(doc(db("alice"), "chatReports", `${id}_bob`)));
  await assertSucceeds(updateDoc(doc(db("admin"), "chatReports", `${id}_bob`), { status: "resolved", reviewedBy: "admin", reviewedAt: serverTimestamp() }));
});
test("fluxo real dos serviços cria, aceita, envia, confirma leitura e evita duplicação", async () => {
  const alice = service("alice"), bob = service("bob");
  const chatId = await alice.requestConversation("bob", "Olá, quero conversar sobre tecnologia.");
  if (chatId !== id) throw new Error("Unexpected chat ID");
  await bob.answerConversation(chatId, true);
  await alice.sendChatMessage(chatId, "Olá, Bob!", "service-message");
  await alice.sendChatMessage(chatId, "Olá, Bob!", "service-message");
  const messages = await getDocs(collection(db("bob"), "conversations", chatId, "messages"));
  if (messages.size !== 1) throw new Error("Mensagem duplicada");
  await bob.markChatRead(chatId);
  await bob.setChatBlocked(chatId, true);
  await assert.rejects(alice.sendChatMessage(chatId, "Mensagem bloqueada", "blocked-message"), /conversa não está disponível/);
});

test("amizade exige pedido e aceite do destinatário, sem permitir acesso a conversas", async () => {
  const alice = service("alice", "social"), bob = service("bob", "social");
  await assertSucceeds(alice.requestFriendship("bob"));
  const friendship = doc(db("alice"), "friendships", id);
  await assertFails(updateDoc(friendship, { status: "accepted", updatedAt: serverTimestamp() }));
  await assertFails(getDoc(doc(db("outsider"), "friendships", id)));
  await assertFails(getDocs(collection(db("outsider"), "friendships")));
  await assertSucceeds(getDocs(query(collection(db("bob"), "friendships"), where("members", "array-contains", "bob"))));
  await assert.rejects(bob.requestFriendship("alice"), /Já existe/);
  await assertSucceeds(bob.answerFriendship(id, true));
  await create();
  await assertFails(send()); // amizade não substitui o aceite da conversa
  await assertSucceeds(alice.removeFriendship(id));
  assert.equal((await getDoc(friendship)).exists(), false);
});

test("recusa e bloqueio não podem ser contornados com pedido de amizade invertido", async () => {
  const alice = service("alice", "social"), bob = service("bob", "social");
  await alice.requestFriendship("bob");
  await bob.answerFriendship(id, false);
  await assertFails(deleteDoc(doc(db("alice"), "friendships", id)));
  await assertFails(setDoc(doc(db("alice"), "friendships", "bob|alice"), {
    members: ["bob", "alice"], requestedBy: "alice", status: "pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
  await bob.removeFriendship(id);
  await accept();
  await updateDoc(ref("bob"), { blockedBy: ["bob"] });
  await assertFails(alice.requestFriendship("bob"));
  await assert.rejects(service("pending", "social").requestFriendship("alice"), /não está disponível/);
});

test("presença só pode ser escrita pelo dono e lida por amigos ou conversas aceitas", async () => {
  const alice = service("alice", "social"), bob = service("bob", "social");
  const status = viewer => doc(db(viewer), "chatStatus", "alice");
  await assertSucceeds(alice.heartbeat());
  await assertFails(getDoc(status("bob")));
  await assertFails(getDoc(status("outsider")));
  await assertFails(getDocs(collection(db("alice"), "chatStatus")));
  await assertFails(updateDoc(status("bob"), { showOnline: false, lastActiveAt: null }));
  await assertFails(updateDoc(status("alice"), { lastActiveAt: new Date(Date.now() + 60_000) }));
  await alice.requestFriendship("bob"); await bob.answerFriendship(id, true);
  await assertSucceeds(getDoc(status("bob")));
  await alice.saveChatPreferences({ showOnline: false, readReceipts: false });
  await alice.heartbeat();
  const hidden = await getDoc(status("bob"));
  assert.equal(hidden.get("lastActiveAt"), null);
  assert.equal(hidden.get("showOnline"), false);
  await assertFails(updateDoc(status("alice"), { lastActiveAt: serverTimestamp() }));
  await alice.removeFriendship(id);
  await assertFails(getDoc(status("bob")));
  await accept();
  await assertSucceeds(getDoc(status("bob")));
  await updateDoc(ref("bob"), { blockedBy: ["bob"] });
  await assertFails(getDoc(status("bob")));
});

test("leitura privada limpa não lidas sem publicar visto quando a confirmação está desativada", async () => {
  await accept(); await send();
  const bob = service("bob"), preferences = service("bob", "social");
  await preferences.saveChatPreferences({ showOnline: true, readReceipts: false });
  await bob.markChatRead(id);
  assert.equal((await getDoc(ref("alice"))).get("readAt.bob"), null);
  const cursor = doc(db("bob"), "chatInbox", "bob", "conversations", id);
  assert.ok((await getDoc(cursor)).get("readAt"));
  await assertFails(getDoc(doc(db("alice"), "chatInbox", "bob", "conversations", id)));
  await assertFails(updateDoc(ref("bob"), { "readAt.bob": serverTimestamp() }));
  await assertFails(setDoc(doc(db("outsider"), "chatInbox", "outsider", "conversations", id), { readAt: serverTimestamp() }));
  await bob.sendChatMessage(id, "Resposta sem visto automático", "private-read-message");
  assert.equal((await getDoc(ref("alice"))).get("readAt.bob"), null);
  await preferences.saveChatPreferences({ showOnline: false, readReceipts: true });
  await bob.markChatRead(id);
  assert.ok((await getDoc(ref("alice"))).get("readAt.bob"));
});

test("snapshot antigo não confirma mensagem nova e o cursor privado chega à caixa em tempo real", async () => {
  await accept();
  const alice = service("alice"), bob = service("bob");
  await alice.sendChatMessage(id, "Primeira", "first");
  await alice.sendChatMessage(id, "Segunda", "second");
  await bob.markChatRead(id, "first");
  assert.equal((await getDoc(ref("alice"))).get("readAt.bob"), null);
  await service("bob", "social").saveChatPreferences({ showOnline: false, readReceipts: false });
  await bob.markChatRead(id, "second");
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { stop(); reject(new Error("Cursor privado não recebido")); }, 8000);
    const stop = bob.subscribeConversations("bob", chats => {
      const chat = chats.find(c => c.id === id);
      if (chat?.privateReadAt) {
        try { assert.equal(bob.isUnread(chat, "bob"), false); clearTimeout(timer); stop(); resolve(); }
        catch (error) { clearTimeout(timer); stop(); reject(error); }
      }
    }, error => { clearTimeout(timer); stop(); reject(error); });
  });
});

test("pedidos ainda pendentes e empresa sem aprovação não consultam presença", async () => {
  await service("alice", "social").heartbeat();
  await create();
  await assertFails(getDoc(doc(db("bob"), "chatStatus", "alice")));
  const companyId = "alice|company";
  await setDoc(ref("company", companyId), request("company", ["alice", "company"]));
  await updateDoc(ref("alice", companyId), { status: "accepted" });
  await assertSucceeds(getDoc(doc(db("company"), "chatStatus", "alice")));
  await env.withSecurityRulesDisabled(async context => updateDoc(doc(context.firestore(), "users", "company"), { companyStatus: "pending" }));
  await assertFails(getDoc(doc(db("company"), "chatStatus", "alice")));
});
