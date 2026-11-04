"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getAdminSession } from "@/services/admin";
import { answerPrivacyRequest, privacyKinds, subscribePrivacyRequests, type PrivacyRequest } from "@/services/privacy";
const button = "rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold text-[#123a5a] disabled:opacity-50";
export default function AdminPrivacyPage() {
  const [access, setAccess] = useState<{ state: "loading" | "guest" | "admin" | "denied" | "error"; uid: string }>({ state: "loading", uid: "" });
  useEffect(() => {
    let active = true;
    const stop = onAuthStateChanged(auth, user => {
      setAccess({ state: user ? "loading" : "guest", uid: user?.uid ?? "" });
      if (user) void getAdminSession().then(session => { if (active && auth.currentUser?.uid === user.uid) setAccess({ state: session.isAdmin ? "admin" : "denied", uid: user.uid }); }).catch(() => { if (active && auth.currentUser?.uid === user.uid) setAccess({ state: "error", uid: user.uid }); });
    });
    return () => { active = false; stop(); };
  }, []);
  return <main className="min-h-screen bg-[#edf6ff] p-4 text-slate-800 sm:p-8"><div className="mx-auto max-w-5xl"><header className="mb-6 flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-black text-[#123a5a]">Solicitações de privacidade</h1><Link href="/admin" className={button}>← Administração</Link></header>
    {access.state === "admin" ? <Inbox key={access.uid} /> : <div className="rounded-2xl bg-white p-6"><p role="status">{{ loading: "Verificando acesso...", guest: "Entre com uma conta administrativa.", denied: "Sua conta não tem acesso a esta área.", error: "Não foi possível conferir o acesso. Atualize a página para tentar novamente." }[access.state]}</p>{access.state === "guest" && <Link href="/login" className={`${button} mt-4 inline-block`}>Entrar</Link>}</div>}
  </div></main>;
}
function Inbox() {
  const [items, setItems] = useState<PrivacyRequest[]>([]), [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  useEffect(() => subscribePrivacyRequests(requests => { setItems(requests); setLoading(false); setError(""); }, () => { setLoading(false); setError("Não foi possível carregar as solicitações. Confira a conexão e a publicação das regras."); }), []);
  const selected = items.find(item => item.id === selectedId);
  return <div className="space-y-5"><p className="rounded-2xl bg-white p-5 text-sm leading-7 text-slate-600">Até 50 solicitações em aberto são exibidas por vez. A resposta fica disponível ao titular em Privacidade e ajuda. Concluir registra a resposta e encerra este atendimento; não executa exclusão de dados. Analise e combine com o titular o tratamento solicitado antes de informar sua conclusão.</p>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {loading ? <p role="status">Carregando...</p> : error ? <p role="alert" className="text-sm text-red-700">{error}</p> : !items.length ? <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">Nenhuma solicitação em aberto.</p> : <ul className="space-y-3">{items.map(item => <li key={item.id} className="rounded-2xl bg-white p-5"><h2 className="font-bold">{privacyKinds[item.kind]} · {item.status === "pending" ? "Recebida" : "Em análise"}</h2><p className="mt-2 break-all text-xs text-slate-500">Conta: {item.userId}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]">{item.message}</p>{item.response && <p className="mt-3 whitespace-pre-wrap break-words border-l-2 border-sky-200 pl-3 text-sm">Resposta atual: {item.response}</p>}<button type="button" onClick={() => { setSelectedId(item.id); setNotice(""); }} className={`${button} mt-4`}>Responder<span className="sr-only"> à solicitação de {item.userId}</span></button></li>)}</ul>}
    {selected && <ResponseForm key={`${selected.id}:${selected.updatedAt?.toMillis()}`} request={selected} onDone={() => { setSelectedId(""); setNotice("Resposta registrada e disponibilizada ao titular."); }} onCancel={() => setSelectedId("")} />}
  </div>;
}
function ResponseForm({ request, onDone, onCancel }: { request: PrivacyRequest; onDone: () => void; onCancel: () => void }) {
  const [response, setResponse] = useState(request.response), [status, setStatus] = useState<"reviewed" | "resolved">("reviewed"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false);
  return <form className="space-y-4 rounded-2xl border border-sky-200 bg-white p-5" onSubmit={async e => { e.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setError(""); try { await answerPrivacyRequest(request.id, request.generation, response, status); onDone(); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível responder."); } finally { lock.current = false; setBusy(false); } }}><h2 className="font-bold">Responder à solicitação selecionada</h2><p className="text-sm">{privacyKinds[request.kind]} · Conta {request.userId}</p><label className="block text-sm font-semibold">Resposta ao titular<textarea disabled={busy} required maxLength={2000} rows={5} value={response} onChange={e => setResponse(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfe8ff] p-3 font-normal" /></label><label className="block text-sm font-semibold">Situação<select disabled={busy} value={status} onChange={e => setStatus(e.target.value as "reviewed" | "resolved")} className="ml-3 rounded-xl border border-[#cfe8ff] p-2"><option value="reviewed">Em análise</option><option value="resolved">Concluída</option></select></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex gap-3"><button disabled={busy || !response.trim()} className={button}>{busy ? "Salvando..." : "Registrar resposta"}</button><button type="button" disabled={busy} onClick={onCancel} className={button}>Cancelar</button></div></form>;
}
