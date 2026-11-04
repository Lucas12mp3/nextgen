"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { privacyKinds, sendPrivacyRequest, subscribeOwnPrivacyRequest, type PrivacyRequest } from "@/services/privacy";
export default function PrivacyContact() {
  const [userId, setUserId] = useState<string | null>(null), [ready, setReady] = useState(false);
  useEffect(() => onAuthStateChanged(auth, user => { setUserId(user?.uid ?? null); setReady(true); }), []);
  if (!ready) return <p role="status">Verificando sua conta...</p>;
  return userId ? <RequestForm key={userId} userId={userId} /> : <p className="text-sm leading-7">Para vincular uma solicitação aos seus dados, <Link className="font-semibold underline" href="/login">entre na sua conta</Link>. Se perdeu a senha, use a <Link href="/recuperar-senha" className="font-semibold underline">recuperação de acesso</Link>.</p>;
}
function RequestForm({ userId }: { userId: string }) {
  const [request, setRequest] = useState<PrivacyRequest | null>(null), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState("");
  const [kind, setKind] = useState<keyof typeof privacyKinds>("ajuda"), [text, setText] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => subscribeOwnPrivacyRequest(userId, result => { setRequest(result); setLoading(false); setLoadError(""); }, () => { setLoading(false); setLoadError("Não foi possível carregar solicitações. Confira a conexão e a publicação das regras."); }), [userId]);
  const active = request && request.status !== "resolved";
  return <div className="space-y-4">
    <p className="text-sm leading-7 text-slate-600">A administração recebe seu pedido e responde nesta página. Uma solicitação de exclusão passa por análise e confirmação; enviar o formulário não apaga a conta automaticamente. Não inclua senha, CPF, CNPJ ou cópias de documentos.</p>
    {loading ? <p role="status">Carregando solicitações...</p> : loadError ? <p role="alert" className="text-sm text-red-700">{loadError}</p> : <>
      {request && <article className="rounded-xl border border-[#dfeeff] bg-[#f6fbff] p-4"><h3 className="font-semibold">Última solicitação · {privacyKinds[request.kind]}</h3><p className="mt-2 text-xs font-semibold">Situação: {{ pending: "Recebida", reviewed: "Em análise", resolved: "Concluída" }[request.status]}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{request.message}</p>{request.response && <div className="mt-4 border-t border-[#cfe8ff] pt-3"><h4 className="text-sm font-bold">Resposta da administração</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{request.response}</p></div>}</article>}
      {!active && <form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setNotice(""); try { await sendPrivacyRequest(kind, text); setText(""); setNotice("Solicitação enviada. Acompanhe a resposta aqui."); } catch (err) { setNotice(err instanceof Error ? err.message : "Não foi possível enviar."); } finally { lock.current = false; setBusy(false); } }}>
        {request && <p className="text-xs text-slate-500">Uma nova solicitação substituirá o registro anterior exibido nesta página.</p>}
        <label className="block text-sm font-semibold">O que você precisa?<select disabled={busy} value={kind} onChange={e => setKind(e.target.value as keyof typeof privacyKinds)} className="mt-2 w-full rounded-xl border border-[#cfe8ff] p-3">{Object.entries(privacyKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="block text-sm font-semibold">Descreva a solicitação<textarea disabled={busy} required minLength={10} maxLength={2000} rows={4} value={text} onChange={e => setText(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfe8ff] p-3 font-normal" /></label>
        <button disabled={busy || text.trim().length < 10} className="rounded-full bg-[#123a5a] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Enviando..." : "Enviar solicitação"}</button>
      </form>}
    </>}
    {notice && <p role="status" className="text-sm text-[#123a5a]">{notice}</p>}
  </div>;
}
