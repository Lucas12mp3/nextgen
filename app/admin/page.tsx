"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { authorizeCompany, getAdminOverview, getAdminSession, listComments, listCompanies, listPosts, listUsers, listWarnings, removeComment, warnUser, type AdminComment, type AdminPost, type AdminUser, type Company, type Overview, type Page, type Warning } from "@/services/admin";

const box = "rounded-3xl border border-[#dfeeff] bg-white p-5 shadow-sm";
const button = "rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold text-[#123a5a] disabled:opacity-50";
const field = "mt-2 w-full rounded-xl border border-[#cfe8ff] bg-white px-3 py-2 text-sm text-slate-800";
const statusLabels: Record<string, string> = { pending: "Pendente", verified: "Autorizada", rejected: "Recusada" };
const actionLabels: Record<string, string> = { companyAuthorization: "Autorização de empresa", deleteComment: "Comentário excluído", warning: "Advertência enviada" };
const date = (value: number | null) => value ? new Date(value).toLocaleString("pt-BR") : "—";
type Tab = "overview" | "companies" | "comments" | "warnings";
const empty = <T,>(): Page<T> => ({ items: [], nextCursor: null });

export default function AdminPage() {
  const [access, setAccess] = useState<"loading" | "guest" | "denied" | "error" | "admin">("loading");
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [companies, setCompanies] = useState<Page<Company>>(empty);
  const [posts, setPosts] = useState<Page<AdminPost>>(empty);
  const [users, setUsers] = useState<Page<AdminUser>>(empty);
  const [comments, setComments] = useState<Page<AdminComment>>(empty);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyStatus, setCompanyStatus] = useState("pending");
  const [companyReason, setCompanyReason] = useState("");
  const [selectedPost, setSelectedPost] = useState<AdminPost | null>(null);
  const [selectedComment, setSelectedComment] = useState<AdminComment | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [targetUser, setTargetUser] = useState<AdminUser | null>(null);
  const [warningReason, setWarningReason] = useState("");
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const running = useRef(false);
  const warningRequest = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const stop = onAuthStateChanged(auth, async user => {
      setAccess("loading"); setError(""); setOverview(null); setCompanies(empty()); setPosts(empty()); setUsers(empty());
      setComments(empty()); setWarnings([]); setSelectedCompany(null); setTargetUser(null); setSelectedPost(null); setSelectedComment(null);
      if (!user) { setAccess("guest"); return; }
      try {
        const session = await getAdminSession();
        if (!active || auth.currentUser?.uid !== user.uid) return;
        if (!session.isAdmin) { setAccess("denied"); return; }
        const [summary, companyPage, postPage, userPage] = await Promise.all([getAdminOverview(), listCompanies(), listPosts(), listUsers()]);
        if (!active || auth.currentUser?.uid !== user.uid) return;
        setOverview(summary); setCompanies(companyPage); setPosts(postPage); setUsers(userPage); setAccess("admin");
      } catch { if (active && auth.currentUser?.uid === user.uid) { setError("Não foi possível abrir o painel. Confira sua conexão e se as regras de acesso do Firestore foram publicadas."); setAccess("error"); } }
    });
    return () => { active = false; stop(); };
  }, []);

  async function execute(task: () => Promise<void>, message = "", refreshStats = false) {
    if (running.current) return;
    running.current = true; setBusy(true); setError(""); setSuccess("");
    try {
      await task(); setSuccess(message);
      if (refreshStats) {
        try { setOverview(await getAdminOverview()); }
        catch { setError("A ação foi salva, mas os indicadores não puderam ser atualizados. Use Atualizar painel."); }
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível concluir a ação."); }
    finally { running.current = false; setBusy(false); }
  }
  async function choosePost(post: AdminPost) {
    await execute(async () => { const result = await listComments(post.id); setSelectedPost(post); setComments(result); setSelectedComment(null); setDeleteReason(""); });
  }
  async function chooseUser(user: AdminUser) {
    await execute(async () => { const result = await listWarnings(user.id); setTargetUser(user); setWarnings(result.items); setWarningReason(""); warningRequest.current = null; setTab("warnings"); });
  }

  if (access !== "admin") return <main className="mx-auto max-w-xl p-8 text-center text-slate-800">
    <h1 className="text-2xl font-black text-[#123a5a]">Administração NextGen</h1>
    {access === "loading" ? <p role="status" className="mt-4">Verificando acesso e carregando indicadores...</p> : <>
      <p role={access === "error" ? "alert" : undefined} className="my-5">{access === "guest" ? "Entre com a conta de administrador para continuar." : access === "denied" ? "Sua conta não tem permissão para acessar este painel." : error}</p>
      {access === "guest" ? <Link className={button} href="/login">Entrar</Link> : access === "error" ? <button className={button} onClick={() => window.location.reload()}>Tentar novamente</button> : <Link className={button} href="/feed">Voltar ao site</Link>}
    </>}
  </main>;

  const metrics: [string, string][] = [["users", "Contas cadastradas"], ["students", "Estudantes"], ["companies", "Empresas"], ["pendingCompanies", "Empresas pendentes"], ["openJobs", "Vagas abertas"], ["posts", "Publicações"], ["applications", "Candidaturas"], ["openChallenges", "Desafios abertos"]];
  const filter = search.trim().toLocaleLowerCase("pt-BR");
  return <main className="min-h-screen bg-[#f3f8fd] p-4 text-slate-800 sm:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#123a5a] p-6 text-white">
        <div><p className="text-xs font-bold uppercase tracking-widest text-sky-200">Gestão da comunidade</p><h1 className="mt-2 text-3xl font-black">Administração NextGen</h1><p className="mt-2 text-sm text-sky-100">Autorizações, moderação e acompanhamento do site.</p></div>
        <div className="flex flex-wrap gap-2"><button disabled={busy} className={secondary} onClick={() => execute(async () => { const [summary, c, p, u] = await Promise.all([getAdminOverview(), listCompanies(), listPosts(), listUsers()]); setOverview(summary); setCompanies(c); setPosts(p); setUsers(u); }, "Painel atualizado.")}>Atualizar painel</button><Link className={secondary} href="/feed">Voltar ao site</Link></div>
      </header>
      <nav aria-label="Seções administrativas" className="flex flex-wrap gap-2">{([["overview", "Visão geral"], ["companies", "Empresas"], ["comments", "Comentários"], ["warnings", "Advertências"]] as [Tab, string][]).map(([key, label]) => <button key={key} disabled={busy} aria-pressed={tab === key} className={tab === key ? button : secondary} onClick={() => { setTab(key); setSearch(""); setError(""); setSuccess(""); }}>{label}</button>)}</nav>
      {busy && <p role="status" className="text-sm text-[#123a5a]">Processando solicitação...</p>}
      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {success && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}

      {tab === "overview" && <>
        <section aria-label="Indicadores do site" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([key, label]) => <div key={key} className={box}><p className="text-sm text-slate-600">{label}</p><p className="mt-3 text-3xl font-black text-[#123a5a]">{(overview?.counts[key] ?? 0).toLocaleString("pt-BR")}</p></div>)}</section>
        <section className={box}><h2 className="text-xl font-bold text-[#123a5a]">Atividade administrativa recente</h2><p className="mt-1 text-sm text-slate-500">Últimas 15 ações registradas.</p><ul className="mt-4 divide-y divide-slate-100">{overview?.activity.map(item => <li key={item.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><strong>{actionLabels[item.action] ?? item.action}</strong><span className="text-xs text-slate-500">{date(item.createdAt)}</span></div><p className="my-2 break-words text-sm">{item.reason}</p><p className="break-all text-xs text-slate-500">Destino: {item.targetId} · Administrador: {item.adminUid}</p></li>)}</ul>{!overview?.activity.length && <p className="mt-4 text-sm text-slate-500">Nenhuma ação administrativa registrada ainda.</p>}</section>
      </>}

      {tab === "companies" && <section className={box}>
        <h2 className="text-xl font-bold text-[#123a5a]">Autorizações de empresas</h2><p className="mt-2 text-sm text-slate-600">Confira os dados antes de aprovar. Ao retirar uma autorização, a empresa perde acesso às ações que exigem aprovação.</p>
        <label className="mt-4 block text-sm font-semibold">Filtrar empresas carregadas<input className={field} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome, CNPJ ou situação" /></label>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Empresas e situação da autorização</caption><thead className="border-b text-[#123a5a]"><tr><th className="p-3">Empresa</th><th className="p-3">CNPJ</th><th className="p-3">Situação</th><th className="p-3">Ação</th></tr></thead><tbody>{companies.items.filter(c => [c.nome, c.cnpj ?? "", statusLabels[c.status] ?? c.status].join(" ").toLocaleLowerCase("pt-BR").includes(filter)).map(c => <tr key={c.id} className="border-b border-slate-100"><td className="p-3"><strong>{c.nome}</strong><p className="text-xs text-slate-500">{c.ramo}</p></td><td className="p-3">{c.cnpj || "Não informado"}</td><td className="p-3">{statusLabels[c.status] ?? c.status}</td><td className="p-3"><button disabled={busy} className={secondary} onClick={() => { setSelectedCompany(c); setCompanyStatus(c.status); setCompanyReason(""); }}>Revisar</button></td></tr>)}</tbody></table></div>
        {!companies.items.length && <p className="py-5 text-sm text-slate-500">Nenhuma empresa cadastrada.</p>}
        {companies.nextCursor && <button disabled={busy} className={secondary + " mt-4"} onClick={() => execute(async () => { const next = await listCompanies(companies.nextCursor); setCompanies({ items: [...companies.items, ...next.items], nextCursor: next.nextCursor }); })}>Carregar mais empresas</button>}
        {selectedCompany && <form className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-5" onSubmit={e => { e.preventDefault(); void execute(async () => { await authorizeCompany(selectedCompany.id, companyStatus, companyReason, selectedCompany.status); setCompanies(current => ({ ...current, items: current.items.map(c => c.id === selectedCompany.id ? { ...c, status: companyStatus } : c) })); setSelectedCompany(null); }, "Autorização atualizada e registrada no histórico.", true); }}>
          <h3 className="font-bold">Revisar: {selectedCompany.nome}</h3><p className="break-all text-xs text-slate-500">UID: {selectedCompany.id}</p>
          <label className="block text-sm font-semibold">Nova situação<select disabled={busy} className={field} value={companyStatus} onChange={e => setCompanyStatus(e.target.value)}><option value="pending">Pendente / retirar autorização</option><option value="verified">Autorizar empresa</option><option value="rejected">Recusar empresa</option></select></label>
          <label className="block text-sm font-semibold">Motivo da decisão<textarea disabled={busy} required minLength={10} maxLength={1000} className={field} value={companyReason} onChange={e => setCompanyReason(e.target.value)} rows={3} placeholder="Explique a decisão para o histórico administrativo." /></label>
          <div className="flex flex-wrap gap-2"><button disabled={busy || companyStatus === selectedCompany.status || companyReason.trim().length < 10} className={button}>Salvar autorização</button><button type="button" disabled={busy} className={secondary} onClick={() => setSelectedCompany(null)}>Cancelar</button></div>
        </form>}
      </section>}

      {tab === "comments" && <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.5fr]">
        <section className={box}><h2 className="text-xl font-bold text-[#123a5a]">Publicações</h2><p className="mt-2 text-sm text-slate-600">Escolha uma publicação para revisar seus comentários.</p><ul className="mt-4 space-y-3">{posts.items.map(post => <li key={post.id}><button disabled={busy} onClick={() => choosePost(post)} className={"w-full rounded-2xl border p-4 text-left disabled:opacity-50 " + (selectedPost?.id === post.id ? "border-sky-500 bg-sky-50" : "border-slate-200")}><strong className="block text-sm">{post.title}</strong><span className="text-xs text-slate-500">{post.authorName}</span><p className="mt-2 line-clamp-3 break-words text-sm">{post.content}</p></button></li>)}</ul>{!posts.items.length && <p className="mt-4 text-sm text-slate-500">Nenhuma publicação encontrada.</p>}{posts.nextCursor && <button disabled={busy} className={secondary + " mt-4"} onClick={() => execute(async () => { const next = await listPosts(posts.nextCursor); setPosts({ items: [...posts.items, ...next.items], nextCursor: next.nextCursor }); })}>Carregar mais publicações</button>}</section>
        <section className={box}><h2 className="text-xl font-bold text-[#123a5a]">Comentários</h2>{!selectedPost ? <p className="mt-4 text-sm text-slate-500">Selecione uma publicação ao lado.</p> : <><p className="mt-2 text-sm text-slate-500">{selectedPost.title}</p><ul className="mt-4 space-y-4">{comments.items.map(comment => <li key={comment.id} className="rounded-2xl border border-slate-200 p-4"><strong className="text-sm">{comment.authorName}</strong><p className="text-xs text-slate-500">{date(comment.createdAt)}</p><p className="my-3 whitespace-pre-wrap break-words text-sm">{comment.content}</p><div className="flex flex-wrap gap-2"><button disabled={busy} className={secondary} onClick={() => { setSelectedComment(comment); setDeleteReason(""); }}>Excluir comentário</button>{comment.authorId && <button disabled={busy} className={secondary} onClick={() => chooseUser({ id: comment.authorId!, nome: comment.authorName, tipoConta: "" })}>Advertir autor</button>}</div></li>)}</ul>{!comments.items.length && <p className="mt-4 text-sm text-slate-500">Esta publicação não tem comentários.</p>}{comments.nextCursor && <button disabled={busy} className={secondary + " mt-4"} onClick={() => execute(async () => { const next = await listComments(selectedPost.id, comments.nextCursor); setComments({ items: [...comments.items, ...next.items], nextCursor: next.nextCursor }); })}>Carregar mais comentários</button>}</>}
        {selectedComment && selectedPost && <form className="mt-5 space-y-4 rounded-2xl border border-red-200 bg-red-50 p-4" onSubmit={e => { e.preventDefault(); void execute(async () => { await removeComment(selectedPost.id, selectedComment.id, deleteReason); setComments(current => ({ ...current, items: current.items.filter(c => c.id !== selectedComment.id) })); setSelectedComment(null); }, "Comentário excluído e motivo registrado.", true); }}><h3 className="font-bold text-red-900">Confirmar exclusão permanente</h3><p className="break-words text-sm">Comentário de {selectedComment.authorName}: {selectedComment.content.slice(0, 200)}</p><label className="block text-sm font-semibold">Motivo da exclusão<textarea disabled={busy} required minLength={10} maxLength={1000} rows={3} className={field} value={deleteReason} onChange={e => setDeleteReason(e.target.value)} /></label><div className="flex flex-wrap gap-2"><button disabled={busy || deleteReason.trim().length < 10} className="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirmar exclusão</button><button type="button" disabled={busy} className={secondary} onClick={() => setSelectedComment(null)}>Cancelar</button></div></form>}
        </section>
      </div>}

      {tab === "warnings" && <section className={box}>
        <h2 className="text-xl font-bold text-[#123a5a]">Advertências</h2><p className="mt-2 text-sm text-slate-600">O usuário recebe um aviso privado nas notificações. Nenhuma suspensão é aplicada automaticamente.</p>
        <label className="mt-4 block text-sm font-semibold">Filtrar usuários carregados<input className={field} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou UID" /></label>
        <ul className="my-4 grid gap-2 sm:grid-cols-2">{users.items.filter(u => (u.nome + " " + u.id).toLocaleLowerCase("pt-BR").includes(filter)).map(user => <li key={user.id}><button disabled={busy} className={"w-full rounded-2xl border p-3 text-left disabled:opacity-50 " + (targetUser?.id === user.id ? "border-sky-500 bg-sky-50" : "border-slate-200")} onClick={() => chooseUser(user)}><strong className="block text-sm">{user.nome}</strong><span className="block break-all text-xs text-slate-500">{user.tipoConta} · {user.id}</span></button></li>)}</ul>
        {users.nextCursor && <button disabled={busy} className={secondary} onClick={() => execute(async () => { const next = await listUsers(users.nextCursor); setUsers({ items: [...users.items, ...next.items], nextCursor: next.nextCursor }); })}>Carregar mais usuários</button>}
        {targetUser && <div className="mt-6 grid gap-5 lg:grid-cols-2"><form className="space-y-4 rounded-2xl bg-amber-50 p-5" onSubmit={e => { e.preventDefault(); void execute(async () => { warningRequest.current ??= crypto.randomUUID(); await warnUser(targetUser.id, warningReason, warningRequest.current); const history = await listWarnings(targetUser.id); setWarnings(history.items); setWarningReason(""); warningRequest.current = null; }, "Advertência registrada e disponibilizada ao usuário.", true); }}><h3 className="font-bold text-amber-950">Advertir {targetUser.nome}</h3><p className="break-all text-xs text-slate-600">UID: {targetUser.id}</p><label className="block text-sm font-semibold">Mensagem para o usuário<textarea disabled={busy} required minLength={10} maxLength={1000} rows={5} className={field} value={warningReason} onChange={e => { setWarningReason(e.target.value); warningRequest.current = null; }} placeholder="Explique a conduta e a orientação para evitar que ela se repita." /></label><button disabled={busy || warningReason.trim().length < 10} className={button}>Enviar advertência</button></form><section><h3 className="font-bold">Histórico do usuário</h3><p className="mt-1 text-xs text-slate-500">Até 25 advertências mais recentes.</p><ul className="mt-3 space-y-3">{warnings.map(w => <li key={w.id} className="rounded-2xl border border-slate-200 p-4"><p className="text-xs text-slate-500">{date(w.createdAt)} · {w.readAt ? "Lida em " + date(w.readAt) : "Ainda não lida"}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{w.reason}</p></li>)}</ul>{!warnings.length && <p className="mt-3 text-sm text-slate-500">Nenhuma advertência registrada.</p>}</section></div>}
      </section>}
    </div>
  </main>;
}
