import { test } from "node:test";
import assert from "node:assert/strict";
import { adminId, authorizeAdmin, authorizationStatus, moderationReason, parseAdminInput, remainingCommentCount } from "../lib/admin-policy.js";

test("sem login: recusa antes de consultar a lista de administradores", async () => {
  let lookedUp = false;
  await assert.rejects(authorizeAdmin(undefined, async () => { lookedUp = true; return true; }), { code: "unauthenticated" });
  assert.equal(lookedUp, false);
});
test("conta autenticada sem registro administrativo não pode executar ações", async () => {
  await assert.rejects(authorizeAdmin("empresa-aprovada", async () => false), { code: "permission-denied" });
});
test("permissão depende do registro atual e sua remoção revoga acesso", async () => {
  let enabled = true;
  const lookup = async uid => uid === "admin-uid" && enabled;
  assert.equal(await authorizeAdmin("admin-uid", lookup), "admin-uid");
  enabled = false;
  await assert.rejects(authorizeAdmin("admin-uid", lookup), { code: "permission-denied" });
});
test("falha de consulta nunca é convertida em autorização", async () => {
  await assert.rejects(authorizeAdmin("uid", async () => { throw new Error("offline"); }), /offline/);
});
test("identificadores não podem redirecionar operações para outro caminho", () => {
  for (const invalid of ["users/admin", "", " ", ".", "..", "uid ", 123, null, "x".repeat(129)]) assert.throws(() => adminId(invalid, "destino"), { code: "invalid-argument" });
  assert.equal(adminId("valid-uid_123", "destino"), "valid-uid_123");
});
test("somente os três estados administrativos exatos são aceitos", () => {
  for (const status of ["verified", "pending", "rejected"]) assert.equal(authorizationStatus(status), status);
  for (const invalid of [["verified"], { status: "verified" }, "admin", "approved", null, true]) assert.throws(() => authorizationStatus(invalid), { code: "invalid-argument" });
});
test("moderação exige motivo válido e limita o tamanho do registro", () => {
  for (const invalid of ["", "    ", "curto", "x".repeat(1001), null]) assert.throws(() => moderationReason(invalid), { code: "invalid-argument" });
  assert.equal(moderationReason("  Motivo da revisão  "), "Motivo da revisão");
  assert.equal(moderationReason("x".repeat(1000)).length, 1000);
});
test("cargas inválidas são recusadas", () => {
  for (const invalid of [null, undefined, "uid", ["verified"]]) assert.throws(() => parseAdminInput(invalid), { code: "invalid-argument" });
});
test("exclusão de comentário não gera contador negativo ou inválido", () => {
  assert.equal(remainingCommentCount(2), 1);
  assert.equal(remainingCommentCount(1), 0);
  for (const invalid of [0, -5, NaN, Infinity, undefined, "3"]) assert.equal(remainingCommentCount(invalid), 0);
});
