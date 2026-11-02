"use client";

import { useState } from "react";
import { canContact, type ChatProfile, type Friendship } from "@/services/chat-policy";
import FriendshipControls from "./FriendshipControls";
import PresenceBadge from "./PresenceBadge";

export default function FriendsPanel({ userId, self, friendships, profiles, loading, blockedIds, onSelect, onDiscover }: {
  userId: string; self: ChatProfile | null; friendships: Friendship[]; profiles: Record<string, ChatProfile>; loading: boolean;
  onSelect: (person: ChatProfile) => void; onDiscover: () => void;
  blockedIds: string[];
}) {
  const [tab, setTab] = useState<"accepted" | "incoming" | "outgoing">("accepted");
  const [search, setSearch] = useState("");
  const incoming = friendships.filter(f => f.status === "pending" && f.requestedBy !== userId).length;
  const visible = friendships.filter(f => tab === "accepted" ? f.status === "accepted"
    : tab === "incoming" ? f.status === "pending" && f.requestedBy !== userId : f.requestedBy === userId && f.status !== "accepted")
    .filter(f => (profiles[f.members.find(id => id !== userId)!]?.nome || "").toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  return <div className="p-5 sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black text-[#123a5a]">Meus amigos</h2><button type="button" onClick={onDiscover} className="rounded-full bg-[#123a5a] px-4 py-2.5 text-sm font-semibold text-white">Encontrar pessoas</button></div>
    <p className="mt-3 text-sm leading-6 text-slate-500">Construa sua rede com estudantes e empresas aprovadas. Cada amizade precisa ser aceita. Para trocar mensagens, a solicitação de conversa também precisa de aceite.</p>
    <div className="my-5 flex flex-wrap gap-2" aria-label="Filtrar amizades">{([ ["accepted", "Amigos"], ["incoming", `Recebidos${incoming ? ` (${incoming})` : ""}`], ["outgoing", "Enviados"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === value ? "bg-[#123a5a] text-white" : "bg-[#edf6ff] text-[#123a5a]"}`}>{label}</button>)}</div>
    <label className="block text-sm font-semibold">Buscar nesta lista<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome do contato" className="mt-2 w-full rounded-xl border border-[#cfe8ff] px-4 py-3 font-normal" /></label>
    {loading ? <p role="status" className="py-8 text-sm text-slate-500">Carregando sua rede...</p> : !visible.length ? <p className="my-6 rounded-2xl border border-dashed border-[#cfe8ff] p-6 text-sm leading-6 text-slate-500">{search ? "Nenhum contato encontrado." : tab === "accepted" ? "Sua rede está começando. Encontre alguém e envie seu primeiro pedido de amizade." : tab === "incoming" ? "Nenhum pedido recebido no momento." : "Nenhum pedido enviado no momento."}</p> : <ul className="mt-5 space-y-3">{visible.map(friendship => {
      const otherId = friendship.members.find(id => id !== userId)!;
      const person = profiles[otherId];
      return <li key={friendship.id} className="rounded-2xl border border-[#dfeeff] p-4">
        <div className="mb-4 flex items-center gap-3"><span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf6ff] font-bold text-[#123a5a]">{(person?.nome || "?").slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="break-words text-sm font-bold">{person?.nome || "Carregando contato..."}</p><p className="text-xs text-slate-500">{person?.tipoConta === "empresa" ? "Empresa" : person?.instituicao || "Estudante"}</p>{friendship.status === "accepted" && <PresenceBadge userId={otherId} allowed={!blockedIds.includes(otherId)} />}</div></div>
        <div className="flex flex-wrap items-start justify-between gap-3"><FriendshipControls userId={userId} otherId={otherId} friendship={friendship} disabled={!self || !person || !canContact(self, person)} />{person && <button type="button" onClick={() => onSelect(person)} className="rounded-full bg-[#123a5a] px-4 py-2 text-xs font-semibold text-white">Conversar</button>}</div>
      </li>;
    })}</ul>}
  </div>;
}
