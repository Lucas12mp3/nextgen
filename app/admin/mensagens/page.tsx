"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { getAdminSession } from "@/services/admin";

type Report = { id: string; reporterId: string; reportedId: string; reason: string; evidence: string; conversationId: string; status: string; createdAt: { toMillis(): number } | null };

export default function ChatReportsPage() {
  const [access, setAccess] = useState<"loading" | "denied" | "admin">("loading");
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [count, setCount] = useState(50);
  useEffect(() => {
    let active = true;
    let stopReports: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, async user => {
      stopReports?.(); setReports([]); setAccess("loading");
      if (!user) { setAccess("denied"); return; }
      try {
        const session = await getAdminSession();
        if (!active || auth.currentUser?.uid !== user.uid) return;
        if (!session.isAdmin) { setAccess("denied"); return; }
        setAccess("admin");
        stopReports = onSnapshot(query(collection(db, "chatReports"), orderBy("createdAt", "desc"), limit(count)), snap => setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report))), () => setError("Não foi possível carregar as denúncias. Confira a publicação das regras."));
      } catch { if (active) { setError("Não foi possível verificar seu acesso."); setAccess("denied"); } }
    });
    return () => { active = false; stopAuth(); stopReports?.(); };
  }, [count]);
  async function review(id: string, status: string) {
    if (busy || !auth.currentUser) return;
    setBusy(id); setError("");
    try { await updateDoc(doc(db, "chatReports", id), { status, reviewedBy: auth.currentUser.uid, reviewedAt: serverTimestamp() }); }
    catch { setError("Não foi possível atualizar a denúncia."); }
    finally { setBusy(""); }
  }
  return <main className="min-h-screen bg-[#edf6ff] p-4 sm:p-8"><div className="mx-auto max-w-5xl"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Administração</p><h1 className="mt-2 text-3xl font-black">Denúncias de mensagens</h1></div><Link href="/admin" className="rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold">← Voltar ao painel</Link></div>
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {access === "loading" ? <p role="status">Verificando acesso...</p> : access !== "admin" ? <p>Acesso exclusivo para administradores.</p> : <><p className="mb-6 text-sm leading-6 text-slate-500">Confira o relato e a mensagem enviada como evidência. A administração não tem acesso ao restante das conversas privadas. Advertências podem ser enviadas pelo painel principal usando o UID do contato denunciado.</p><div className="space-y-4">{reports.length === 0 && <p className="rounded-2xl bg-white p-6 text-slate-500">Nenhuma denúncia recebida.</p>}{reports.map(report => <article key={report.id} className="rounded-2xl border border-[#dfeeff] bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold">{report.status === "resolved" ? "Resolvida" : report.status === "reviewed" ? "Em análise" : "Nova denúncia"}</h2><time className="text-xs text-slate-500">{report.createdAt?.toMillis ? new Date(report.createdAt.toMillis()).toLocaleString("pt-BR") : "Agora"}</time></div><p className="mt-4 whitespace-pre-wrap break-words text-sm">{report.reason}</p>{report.evidence && <blockquote className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-[#f6fbff] p-4 text-sm"><p className="mb-2 text-xs font-semibold text-slate-500">Mensagem denunciada</p>{report.evidence}</blockquote>}<p className="mt-4 break-all text-xs text-slate-500">Denunciado: {report.reportedId}</p><p className="mt-1 break-all text-xs text-slate-500">Autor do relato: {report.reporterId}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!!busy || report.status !== "open"} onClick={() => void review(report.id, "reviewed")} className="rounded-full border border-[#cfe8ff] px-4 py-2 text-sm font-semibold disabled:opacity-40">Marcar em análise</button><button type="button" disabled={!!busy || report.status === "resolved"} onClick={() => void review(report.id, "resolved")} className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Concluir análise</button></div></article>)}</div>{reports.length >= count && <button type="button" onClick={() => setCount(value => value + 50)} className="mt-5 rounded-full border border-[#cfe8ff] bg-white px-5 py-3 text-sm font-semibold">Carregar denúncias anteriores</button>}</>}
  </div></main>;
}
