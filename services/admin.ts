import { collection, doc, documentId, getCountFromServer, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, startAfter, where, type Query } from "firebase/firestore";
import { auth, db } from "@/firebase/config";

export type Page<T> = { items: T[]; nextCursor: string | null };
export type Company = { id: string; nome: string; ramo: string; status: string; cnpj: string | null };
export type AdminPost = { id: string; title: string; authorName: string; content: string };
export type AdminComment = { id: string; authorId: string | null; authorName: string; content: string; createdAt: number | null };
export type AdminUser = { id: string; nome: string; tipoConta: string };
export type Warning = { id: string; reason: string; createdAt: number | null; readAt: number | null };
export type Overview = { counts: Record<string, number>; activity: { id: string; action: string; targetId: string; adminUid: string; reason: string; createdAt: number | null }[] };
const millis = (value: { toMillis?: () => number } | null | undefined) => value?.toMillis?.() ?? null;
async function page(source: Query, cursor: unknown) {
  const result = await getDocs(query(source, orderBy(documentId()), ...(typeof cursor === "string" ? [startAfter(cursor)] : []), limit(26)));
  return { docs: result.docs.slice(0, 25), nextCursor: result.size > 25 ? result.docs[24].id : null };
}
async function call<T>(name: string, data: Record<string, unknown> = {}): Promise<T> {
  const adminUid = auth.currentUser?.uid;
  if (!adminUid) throw new Error("Entre na sua conta.");
  const admin = await getDoc(doc(db, "admins", adminUid));
  if (name === "getAdminSession") return { isAdmin: admin.exists() } as T;
  if (!admin.exists()) throw new Error("Acesso exclusivo para administradores.");
  const id = (key: string) => {
    const value = data[key];
    if (typeof value !== "string" || !value || value.includes("/") || value === "." || value === "..") throw new Error("Identificador inválido.");
    return value;
  };
  if (name === "getAdminOverview") {
    const sources: Record<string, Query> = {
      users: collection(db, "users"), students: query(collection(db, "users"), where("tipoConta", "==", "estudante")),
      companies: query(collection(db, "users"), where("tipoConta", "==", "empresa")), pendingCompanies: query(collection(db, "users"), where("companyStatus", "==", "pending")),
      openJobs: query(collection(db, "vagas"), where("status", "==", "aberta")), posts: collection(db, "posts"), applications: collection(db, "applications"),
    openChallenges: query(collection(db, "desafios"), where("status", "==", "aberto"), where("scoringVersion", "==", 2)),
    };
    const counts = Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([key, source]) => [key, (await getCountFromServer(source)).data().count])));
    const audit = await getDocs(query(collection(db, "adminAudit"), orderBy("createdAt", "desc"), limit(15)));
    return { counts, activity: audit.docs.map(d => ({ ...d.data(), id: d.id, createdAt: millis(d.get("createdAt")) })) } as T;
  }
  if (name === "listAdminWarnings") {
    const result = await getDocs(query(collection(db, "users", id("userId"), "advertencias"), orderBy("createdAt", "desc"), limit(25)));
    return { items: result.docs.map(d => ({ ...d.data(), id: d.id, createdAt: millis(d.get("createdAt")), readAt: millis(d.get("readAt")) })) } as T;
  }
  if (name.startsWith("listAdmin")) {
    const source = name === "listAdminCompanies" ? query(collection(db, "users"), where("tipoConta", "==", "empresa"))
      : name === "listAdminUsers" ? collection(db, "users") : name === "listAdminPosts" ? collection(db, "posts") : collection(db, "posts", id("postId"), "comments");
    const result = await page(source, data.cursor);
    const items = await Promise.all(result.docs.map(async d => {
      if (name === "listAdminCompanies") {
        const privateDoc = await getDoc(doc(d.ref, "privado", "dados"));
        return { id: d.id, nome: d.get("nome") ?? "Empresa", ramo: d.get("ramo") ?? "", status: d.get("companyStatus") ?? "pending", cnpj: privateDoc.get("cnpj") ?? d.get("cnpj") ?? null };
      }
      return { id: d.id, nome: d.get("nome") ?? "Usuário", tipoConta: d.get("tipoConta") ?? "", title: d.get("title") ?? "Publicação", authorName: d.get("authorName") ?? "Usuário", authorId: d.get("authorId") ?? null, content: String(d.get("content") ?? "").slice(0, name === "listAdminPosts" ? 400 : 5000), createdAt: millis(d.get("createdAt")) };
    }));
    return { items, nextCursor: result.nextCursor } as T;
  }
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";
  if (reason.length < 10 || reason.length > 1000) throw new Error("Informe um motivo de 10 a 1000 caracteres.");
  const audit = name === "issueUserWarning" ? doc(db, "adminAudit", `warning_${id("userId")}_${id("requestId")}`)
    : name === "deleteCommentAsAdmin" ? doc(db, "adminAudit", `comment_${id("postId")}_${id("commentId")}`) : doc(collection(db, "adminAudit"));
  await runTransaction(db, async tx => {
    const base = { adminUid, reason, createdAt: serverTimestamp() };
    if (name === "setCompanyAuthorization") {
      const ref = doc(db, "users", id("companyUid")), company = await tx.get(ref);
      if (!company.exists() || company.get("tipoConta") !== "empresa") throw new Error("Empresa não encontrada.");
      if (!["pending", "verified", "rejected"].includes(String(data.status))) throw new Error("Situação inválida.");
      if ((company.get("companyStatus") ?? "pending") !== data.expectedStatus) throw new Error("A empresa foi alterada. Atualize o painel.");
      tx.update(ref, { companyStatus: data.status, companyReviewedAt: serverTimestamp(), companyReviewedBy: adminUid, companyReviewAuditId: audit.id });
      tx.set(audit, { ...base, action: "companyAuthorization", targetId: ref.id, previousStatus: data.expectedStatus, status: data.status });
    } else if (name === "deleteCommentAsAdmin") {
      const postRef = doc(db, "posts", id("postId")), ref = doc(postRef, "comments", id("commentId"));
      const post = await tx.get(postRef), comment = await tx.get(ref);
      if (!comment.exists()) throw new Error("Este comentário já foi excluído.");
      tx.delete(ref);
      if (post.exists()) tx.update(postRef, { commentsCount: Math.max(0, Number(post.get("commentsCount") ?? 0) - 1) });
      tx.set(audit, { ...base, action: "deleteComment", targetId: ref.id, postId: postRef.id, authorId: comment.get("authorId") ?? null });
    } else if (name === "issueUserWarning") {
      const user = await tx.get(doc(db, "users", id("userId"))), ref = doc(db, "users", id("userId"), "advertencias", id("requestId")), existing = await tx.get(ref);
      if (!user.exists()) throw new Error("Usuário não encontrado.");
      if (existing.exists()) {
        if (existing.get("reason") !== reason || existing.get("adminUid") !== adminUid) throw new Error("Requisição já utilizada.");
        return;
      }
      tx.set(ref, { ...base, readAt: null });
      tx.set(audit, { ...base, action: "warning", targetId: user.id, warningId: ref.id });
    } else throw new Error("Ação desconhecida.");
  });
  return { ok: true } as T;
}
export const getAdminSession = () => call<{ isAdmin: boolean }>("getAdminSession");
export const getAdminOverview = () => call<Overview>("getAdminOverview");
export const listCompanies = (cursor: string | null = null) => call<Page<Company>>("listAdminCompanies", { cursor });
export const listPosts = (cursor: string | null = null) => call<Page<AdminPost>>("listAdminPosts", { cursor });
export const listComments = (postId: string, cursor: string | null = null) => call<Page<AdminComment>>("listAdminComments", { postId, cursor });
export const listUsers = (cursor: string | null = null) => call<Page<AdminUser>>("listAdminUsers", { cursor });
export const listWarnings = (userId: string) => call<{ items: Warning[] }>("listAdminWarnings", { userId });
export const authorizeCompany = (companyUid: string, status: string, reason: string, expectedStatus: string) => call("setCompanyAuthorization", { companyUid, status, reason, expectedStatus });
export const removeComment = (postId: string, commentId: string, reason: string) => call("deleteCommentAsAdmin", { postId, commentId, reason });
export const warnUser = (userId: string, reason: string, requestId: string) => call("issueUserWarning", { userId, reason, requestId });
