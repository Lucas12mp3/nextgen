import { FieldPath, FieldValue, getFirestore, Query } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { adminId as id, authorizeAdmin, authorizationStatus, moderationReason as reason, parseAdminInput as input, remainingCommentCount } from "./admin-policy.js";

const options = { region: "southamerica-east1", maxInstances: 5 };
const db = () => getFirestore();
async function requireAdmin(uid?: string): Promise<string> {
  return authorizeAdmin(uid, async accountUid => (await db().doc(`admins/${accountUid}`).get()).exists);
}
function millis(value: unknown): number | null {
  return value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function" ? value.toMillis() : null;
}
async function page(query: Query, cursor: unknown) {
  let ordered = query.orderBy(FieldPath.documentId());
  if (cursor !== undefined && cursor !== null) ordered = ordered.startAfter(id(cursor, "cursor"));
  const snap = await ordered.limit(26).get();
  const docs = snap.docs.slice(0, 25);
  return { docs, nextCursor: snap.size > 25 ? docs[24].id : null };
}

export const getAdminSession = onCall(options, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Entre na sua conta.");
  return { isAdmin: (await db().doc(`admins/${request.auth.uid}`).get()).exists };
});

export const getAdminOverview = onCall(options, async (request) => {
  await requireAdmin(request.auth?.uid);
  const queries: Record<string, Query> = {
    users: db().collection("users"),
    students: db().collection("users").where("tipoConta", "==", "estudante"),
    companies: db().collection("users").where("tipoConta", "==", "empresa"),
    pendingCompanies: db().collection("users").where("companyStatus", "==", "pending"),
    openJobs: db().collection("vagas").where("status", "==", "aberta"),
    posts: db().collection("posts"),
    applications: db().collection("applications"),
    openChallenges: db().collection("desafios").where("status", "==", "aberto"),
  };
  const counts = Object.fromEntries(await Promise.all(Object.entries(queries).map(async ([key, query]) => [key, (await query.count().get()).data().count])));
  const audit = await db().collection("adminAudit").orderBy("createdAt", "desc").limit(15).get();
  return { counts, activity: audit.docs.map(doc => ({ id: doc.id, action: doc.get("action"), targetId: doc.get("targetId"), adminUid: doc.get("adminUid"), reason: doc.get("reason"), createdAt: millis(doc.get("createdAt")) })) };
});

export const listAdminCompanies = onCall(options, async (request) => {
  await requireAdmin(request.auth?.uid);
  const { docs, nextCursor } = await page(db().collection("users").where("tipoConta", "==", "empresa"), input(request.data).cursor);
  const items = await Promise.all(docs.map(async doc => {
    const privateDoc = await doc.ref.collection("privado").doc("dados").get();
    return { id: doc.id, nome: String(doc.get("nome") ?? "Empresa"), ramo: String(doc.get("ramo") ?? ""), status: String(doc.get("companyStatus") ?? "pending"), cnpj: typeof privateDoc.get("cnpj") === "string" ? privateDoc.get("cnpj") : null };
  }));
  return { items, nextCursor };
});

export const setCompanyAuthorization = onCall(options, async (request) => {
  const adminUid = await requireAdmin(request.auth?.uid);
  const data = input(request.data);
  const companyUid = id(data.companyUid, "empresa");
  const status = authorizationStatus(data.status);
  const expectedStatus = authorizationStatus(data.expectedStatus);
  const explanation = reason(data.reason);
  const ref = db().doc(`users/${companyUid}`);
  const auditRef = db().collection("adminAudit").doc();
  await db().runTransaction(async tx => {
    const [admin, company] = await Promise.all([tx.get(db().doc(`admins/${adminUid}`)), tx.get(ref)]);
    if (!admin.exists) throw new HttpsError("permission-denied", "Sua permissão de administrador foi removida.");
    if (!company.exists || company.get("tipoConta") !== "empresa") throw new HttpsError("not-found", "Empresa não encontrada.");
    if (company.get("companyStatus") === status) return;
    if ((company.get("companyStatus") ?? "pending") !== expectedStatus) throw new HttpsError("failed-precondition", "Outro administrador alterou esta empresa. Atualize o painel antes de revisar novamente.");
    tx.update(ref, { companyStatus: status, companyReviewedAt: FieldValue.serverTimestamp(), companyReviewedBy: adminUid });
    tx.create(auditRef, { action: "companyAuthorization", targetId: companyUid, previousStatus: company.get("companyStatus") ?? "pending", status, reason: explanation, adminUid, createdAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

export const listAdminPosts = onCall(options, async (request) => {
  await requireAdmin(request.auth?.uid);
  const { docs, nextCursor } = await page(db().collection("posts"), input(request.data).cursor);
  return { items: docs.map(doc => ({ id: doc.id, title: String(doc.get("title") ?? "Publicação"), authorName: String(doc.get("authorName") ?? "Usuário"), content: String(doc.get("content") ?? "").slice(0, 400) })), nextCursor };
});

export const listAdminComments = onCall(options, async (request) => {
  await requireAdmin(request.auth?.uid);
  const data = input(request.data);
  const postId = id(data.postId, "publicação");
  const { docs, nextCursor } = await page(db().collection(`posts/${postId}/comments`), data.cursor);
  return { items: docs.map(doc => ({ id: doc.id, authorId: typeof doc.get("authorId") === "string" ? doc.get("authorId") : null, authorName: String(doc.get("authorName") ?? "Usuário"), content: String(doc.get("content") ?? "").slice(0, 5000), createdAt: millis(doc.get("createdAt")) })), nextCursor };
});

export const deleteCommentAsAdmin = onCall(options, async (request) => {
  const adminUid = await requireAdmin(request.auth?.uid);
  const data = input(request.data);
  const postId = id(data.postId, "publicação"), commentId = id(data.commentId, "comentário");
  const explanation = reason(data.reason);
  const postRef = db().doc(`posts/${postId}`), commentRef = postRef.collection("comments").doc(commentId);
  const auditRef = db().collection("adminAudit").doc();
  await db().runTransaction(async tx => {
    const [admin, post, comment] = await Promise.all([tx.get(db().doc(`admins/${adminUid}`)), tx.get(postRef), tx.get(commentRef)]);
    if (!admin.exists) throw new HttpsError("permission-denied", "Sua permissão de administrador foi removida.");
    if (!comment.exists) throw new HttpsError("not-found", "Este comentário já foi excluído.");
    tx.delete(commentRef);
    if (post.exists) tx.update(postRef, { commentsCount: remainingCommentCount(post.get("commentsCount")) });
    tx.create(auditRef, { action: "deleteComment", targetId: commentId, postId, authorId: comment.get("authorId") ?? null, reason: explanation, adminUid, createdAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

export const listAdminUsers = onCall(options, async (request) => {
  await requireAdmin(request.auth?.uid);
  const { docs, nextCursor } = await page(db().collection("users"), input(request.data).cursor);
  return { items: docs.map(doc => ({ id: doc.id, nome: String(doc.get("nome") ?? "Usuário"), tipoConta: String(doc.get("tipoConta") ?? "") })), nextCursor };
});

export const issueUserWarning = onCall(options, async (request) => {
  const adminUid = await requireAdmin(request.auth?.uid);
  const data = input(request.data), userId = id(data.userId, "usuário"), requestId = id(data.requestId, "requisição");
  const explanation = reason(data.reason);
  const ref = db().doc(`users/${userId}/advertencias/${requestId}`), auditRef = db().doc(`adminAudit/warning_${userId}_${requestId}`);
  await db().runTransaction(async tx => {
    const [admin, user, existing] = await Promise.all([tx.get(db().doc(`admins/${adminUid}`)), tx.get(db().doc(`users/${userId}`)), tx.get(ref)]);
    if (!admin.exists) throw new HttpsError("permission-denied", "Sua permissão de administrador foi removida.");
    if (!user.exists) throw new HttpsError("not-found", "Usuário não encontrado.");
    if (existing.exists) {
      if (existing.get("adminUid") !== adminUid || existing.get("reason") !== explanation) throw new HttpsError("already-exists", "Esta requisição já foi utilizada.");
      return;
    }
    tx.create(ref, { reason: explanation, adminUid, createdAt: FieldValue.serverTimestamp(), readAt: null });
    tx.create(auditRef, { action: "warning", targetId: userId, reason: explanation, adminUid, createdAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

export const listAdminWarnings = onCall(options, async (request) => {
  await requireAdmin(request.auth?.uid);
  const userId = id(input(request.data).userId, "usuário");
  const warnings = await db().collection(`users/${userId}/advertencias`).orderBy("createdAt", "desc").limit(25).get();
  return { items: warnings.docs.map(doc => ({ id: doc.id, reason: doc.get("reason"), createdAt: millis(doc.get("createdAt")), readAt: millis(doc.get("readAt")) })) };
});
