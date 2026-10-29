import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/config";

export type Page<T> = { items: T[]; nextCursor: string | null };
export type Company = { id: string; nome: string; ramo: string; status: string; cnpj: string | null };
export type AdminPost = { id: string; title: string; authorName: string; content: string };
export type AdminComment = { id: string; authorId: string | null; authorName: string; content: string; createdAt: number | null };
export type AdminUser = { id: string; nome: string; tipoConta: string };
export type Warning = { id: string; reason: string; createdAt: number | null; readAt: number | null };
export type Overview = { counts: Record<string, number>; activity: { id: string; action: string; targetId: string; adminUid: string; reason: string; createdAt: number | null }[] };
async function call<T>(name: string, data: Record<string, unknown> = {}): Promise<T> {
  return (await httpsCallable<Record<string, unknown>, T>(functions, name)(data)).data;
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
