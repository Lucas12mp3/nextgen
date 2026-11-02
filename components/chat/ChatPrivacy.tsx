"use client";

import { useState } from "react";
import { saveChatPreferences } from "@/services/social";
import { type ChatPreferences } from "@/services/chat-policy";
import { useChatActivity } from "./ChatActivityProvider";

export default function ChatPrivacy() {
  const activity = useChatActivity();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function toggle(key: keyof ChatPreferences, value: boolean) {
    if (busy || !activity.ready) return;
    setBusy(true); setMessage("");
    try { await saveChatPreferences({ showOnline: activity.status.showOnline, readReceipts: activity.status.readReceipts, [key]: value }); setMessage("Preferência salva."); }
    catch { setMessage("Não foi possível salvar. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <details className="mb-4 rounded-2xl border border-[#dfeeff] bg-white text-sm">
    <summary className="cursor-pointer px-5 py-4 font-semibold text-[#123a5a]">Privacidade das mensagens</summary>
    <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
      {([ ["showOnline", "Mostrar quando estou online", "Visível para amigos e contatos com conversa aceita. Bloqueados não podem consultar."],
        ["readReceipts", "Enviar confirmação de leitura", "Ao desativar, novas leituras não enviam Visto. Suas mensagens continuam sendo marcadas como lidas para você."] ] as const).map(([key, label, help]) =>
        <label key={key} className="flex items-start gap-3 rounded-xl bg-[#f8fbff] p-4"><input type="checkbox" checked={activity.status[key]} disabled={!activity.ready || busy} onChange={e => void toggle(key, e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#123a5a]" /><span><span className="block font-semibold">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{help}</span></span></label>)}
      <p className="text-xs leading-5 text-slate-500 sm:col-span-2">O online representa atividade recente e pode levar até dois minutos para desaparecer após fechar o site. Confirmações já enviadas permanecem no histórico.</p>
      {(activity.error || message) && <p role="status" className="text-sm text-[#123a5a] sm:col-span-2">{activity.error || message}</p>}
    </div>
  </details>;
}
