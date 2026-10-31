"use client";

import { useEffect, useRef, useState } from "react";
import {
  answerConversation, canContact, canSend, isUnread, markChatRead, olderMessages, reportConversation,
  sendChatMessage, setChatBlocked, subscribeMessages, type ChatMessage, type ChatProfile, type Conversation, type MessageCursor,
} from "@/services/chat";

const primary = "rounded-full bg-[#123a5a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
const secondary = "rounded-full border border-[#cfe8ff] bg-white px-3 py-2 text-xs font-semibold text-[#123a5a] disabled:opacity-50";
const time = (value: ChatMessage["createdAt"]) => value?.toMillis ? new Date(value.toMillis()).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Enviando...";
function mergeMessages(a: ChatMessage[], b: ChatMessage[]) {
  return [...new Map([...a, ...b].map(message => [message.id, message])).values()].sort((x, y) =>
    (x.createdAt?.toMillis() ?? Date.now()) - (y.createdAt?.toMillis() ?? Date.now()) || x.id.localeCompare(y.id));
}

export default function ConversationView({ chat, userId, other, self, onBack }: {
  chat: Conversation; userId: string; other: ChatProfile | null; self: ChatProfile | null; onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursor = useRef<MessageCursor | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const followLatest = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const retry = useRef<{ text: string; id: string } | null>(null);
  const reading = useRef(false);
  const ownBlock = chat.blockedBy.includes(userId);
  const canWrite = canSend(chat, userId) && !!self && !!other && canContact(self, other);
  const lastIncoming = [...messages].reverse().find(message => message.senderId !== userId);

  useEffect(() => subscribeMessages(chat.id, 50, (items, oldest, hasMore) => {
    setMessages(previous => mergeMessages(previous, items));
    if (!cursor.current) { cursor.current = oldest; setMore(hasMore); }
    setLoading(false);
  }, () => { setLoading(false); setError("Não foi possível carregar as mensagens. Atualize a página para tentar novamente."); }), [chat.id]);

  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    if (followLatest.current && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [lastId]);

  useEffect(() => {
    let active = true;
    function read() {
      if (atBottom && !document.hidden && document.hasFocus() && isUnread(chat, userId) && !reading.current) {
        reading.current = true;
        void markChatRead(chat.id).catch(() => { if (active) setError("Não foi possível confirmar a leitura. Suas mensagens continuam disponíveis."); }).finally(() => { reading.current = false; });
      }
    }
    read();
    document.addEventListener("visibilitychange", read); window.addEventListener("focus", read);
    return () => { active = false; document.removeEventListener("visibilitychange", read); window.removeEventListener("focus", read); };
  }, [chat, userId, atBottom]);

  async function action(task: () => Promise<unknown>, success = "") {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setNotice("");
    try { await task(); if (success) setNotice(success); }
    catch (err) { setError((err as { code?: string }).code === "permission-denied" ? "Esta ação não está disponível. Confira a situação da conversa e as permissões da conta." : err instanceof Error ? err.message : "Não foi possível concluir a ação. Tente novamente."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite || !draft.trim()) return;
    const text = draft.trim();
    if (retry.current?.text !== text) retry.current = { text, id: crypto.randomUUID() };
    const messageId = retry.current.id;
    await action(async () => {
      await sendChatMessage(chat.id, text, messageId);
      setDraft(""); retry.current = null; followLatest.current = true;
      requestAnimationFrame(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; });
    });
  }
  async function loadOlder() {
    if (!cursor.current || loadingMore) return;
    setLoadingMore(true);
    const previousHeight = scroller.current?.scrollHeight ?? 0;
    const previousTop = scroller.current?.scrollTop ?? 0;
    try {
      const result = await olderMessages(chat.id, cursor.current);
      followLatest.current = false;
      setAtBottom(false);
      setMessages(previous => mergeMessages(previous, result.items));
      cursor.current = result.cursor; setMore(result.more);
      requestAnimationFrame(() => { if (scroller.current) scroller.current.scrollTop = previousTop + scroller.current.scrollHeight - previousHeight; });
    } catch { setError("Não foi possível carregar o histórico. Tente novamente."); }
    finally { setLoadingMore(false); }
  }

  return <div className="flex h-[max(600px,75dvh)] max-h-[850px] flex-col">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf3ff] p-4">
      <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={onBack} aria-label="Voltar às conversas" className={`${secondary} md:hidden`}>←</button><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#edf6ff] font-black text-[#123a5a]">{(other?.nome || "C").slice(0, 1).toUpperCase()}</span><div className="min-w-0"><h2 className="break-words text-sm font-bold text-[#123a5a]">{other?.nome || "Carregando contato..."}</h2><p className="text-xs text-slate-500">{other?.tipoConta === "empresa" ? "Empresa" : "Estudante"} · {chat.status === "pending" ? "Solicitação de conversa" : chat.status === "declined" ? "Solicitação recusada" : "Conversa privada"}</p></div></div>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void action(() => setChatBlocked(chat.id, !ownBlock), ownBlock ? "Contato desbloqueado." : "Contato bloqueado. Nenhuma nova mensagem pode ser enviada.")} className={secondary}>{ownBlock ? "Desbloquear" : "Bloquear"}</button><button type="button" onClick={() => setReportOpen(!reportOpen)} aria-expanded={reportOpen} aria-controls="report-chat" className={secondary}>Denunciar</button></div>
    </header>
    {error && <p role="alert" className="mx-4 mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="mx-4 mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {reportOpen && <form id="report-chat" onSubmit={event => { event.preventDefault(); void action(async () => { await reportConversation(chat, reportReason, lastIncoming); setReportOpen(false); setReportReason(""); }, "Denúncia enviada à administração. Você também pode bloquear o contato."); }} className="m-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><label className="block text-sm font-semibold">O que aconteceu?<textarea required minLength={10} maxLength={1000} value={reportReason} onChange={event => setReportReason(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-amber-200 bg-white p-3 font-normal" /></label><p className="my-3 text-xs leading-5 text-amber-900">A administração receberá seu relato{lastIncoming ? " e a última mensagem recebida carregada nesta tela" : ""}. O restante da conversa permanece restrito aos participantes.</p><button disabled={busy || reportReason.trim().length < 10} className={primary}>Enviar denúncia</button></form>}
    <div ref={scroller} onScroll={event => { const element = event.currentTarget; followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100; setAtBottom(followLatest.current); }} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#f8fbff] p-4 sm:p-6" aria-label="Histórico de mensagens" aria-busy={loading}>
      {more && <div className="text-center"><button type="button" onClick={() => void loadOlder()} disabled={loadingMore} className={secondary}>{loadingMore ? "Carregando..." : "Carregar mensagens anteriores"}</button></div>}
      <div className="mx-auto max-w-md rounded-2xl border border-[#dfeeff] bg-white p-4 text-sm"><p className="mb-2 text-xs font-semibold text-slate-400">Apresentação de {chat.createdBy === userId ? "você" : other?.nome || "contato"}</p><p className="whitespace-pre-wrap break-words text-slate-700 [overflow-wrap:anywhere]">{chat.intro}</p></div>
      {loading && <p role="status" className="text-center text-sm text-slate-500">Carregando mensagens...</p>}
      <ol className="space-y-3">{messages.map(message => {
        const mine = message.senderId === userId;
        const read = mine && !!other && (chat.readAt[other.uid]?.toMillis() ?? 0) >= (message.createdAt?.toMillis() ?? Infinity);
        return <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[78%] ${mine ? "rounded-br-sm bg-[#123a5a] text-white" : "rounded-bl-sm border border-[#dfeeff] bg-white text-slate-800"}`}><p className="sr-only">{mine ? "Você" : other?.nome || "Contato"}</p><p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{message.text}</p><p className={`mt-2 text-right text-[10px] ${mine ? "text-sky-100" : "text-slate-400"}`}>{time(message.createdAt)}{mine ? read ? " · Lida" : " · Enviada" : ""}</p></div></li>;
      })}</ol>
      {chat.status === "accepted" && !messages.length && !loading && <p className="text-center text-sm text-slate-500">Solicitação aceita. Vocês já podem conversar!</p>}
    </div>
    <footer className="border-t border-[#edf3ff] bg-white p-4">
      {!atBottom && <button type="button" className="mb-3 text-xs font-semibold text-[#2577bd]" onClick={() => { followLatest.current = true; setAtBottom(true); if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }}>↓ Ir para as mensagens recentes</button>}
      {chat.blockedBy.length > 0 ? <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">{ownBlock ? "Você bloqueou este contato. Desbloqueie para permitir novas mensagens." : "Esta conversa está bloqueada para novas mensagens."}</p>
        : chat.status === "pending" ? chat.createdBy === userId ? <p className="text-sm text-slate-500">Solicitação enviada. Aguarde o aceite para continuar a conversa.</p> : <div><p className="mb-3 text-sm text-slate-600">Você quer conversar com este contato? Aceite apenas se estiver à vontade.</p><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void action(() => answerConversation(chat.id, true))} className={primary}>Aceitar conversa</button><button type="button" disabled={busy} onClick={() => void action(() => answerConversation(chat.id, false))} className={secondary}>Recusar</button></div></div>
        : chat.status === "declined" ? <p className="text-sm text-slate-500">A solicitação foi recusada. Novas mensagens estão desativadas.</p>
        : !canWrite ? <p className="text-sm text-amber-800">O envio está indisponível. Empresas precisam manter a aprovação administrativa.</p>
        : <form ref={form} onSubmit={send}><label className="sr-only" htmlFor="chat-message">Escreva sua mensagem</label><div className="flex items-end gap-3"><textarea id="chat-message" value={draft} disabled={busy} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); form.current?.requestSubmit(); } }} maxLength={2000} rows={2} placeholder="Escreva uma mensagem..." className="max-h-40 min-w-0 flex-1 resize-y rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-3 text-sm" /><button type="submit" disabled={busy || !draft.trim()} className={primary}>{busy ? "Enviando..." : "Enviar"}</button></div><p className="mt-2 text-xs text-slate-400">Enter envia · Shift + Enter quebra a linha · {draft.length}/2000</p></form>}
    </footer>
  </div>;
}
