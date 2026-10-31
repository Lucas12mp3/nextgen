"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { canContact, conversationId, findPeople, getChatProfile, isUnread, requestConversation, subscribeConversations, type ChatProfile, type Conversation } from "@/services/chat";
import ConversationView from "./ConversationView";

const primary = "rounded-full bg-[#123a5a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#20557e] disabled:opacity-50";
const secondary = "rounded-full border border-[#cfe8ff] bg-white px-4 py-2.5 text-sm font-semibold text-[#123a5a] disabled:opacity-50";

export default function ChatWorkspace() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => onAuthStateChanged(auth, current => { setUser(current); setReady(true); }), []);
  if (!ready) return <main className="p-8 text-center" role="status">Verificando sua conta...</main>;
  if (!user) return <main className="mx-auto max-w-xl p-8 text-center"><h1 className="text-3xl font-black">Suas conversas, em um só lugar</h1><p className="my-5 text-slate-600">Entre para conversar com estudantes e empresas da comunidade.</p><Link href="/login" className={primary}>Entrar para conversar</Link></main>;
  return <Inbox key={user.uid} user={user} />;
}

function Inbox({ user }: { user: User }) {
  const requestedUid = useSearchParams().get("to");
  const [profile, setProfile] = useState<ChatProfile | null>(null);
  const [chats, setChats] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [target, setTarget] = useState<ChatProfile | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ChatProfile>>({});
  const cached = useRef<Record<string, ChatProfile>>({});
  const [error, setError] = useState("");
  const [showPeople, setShowPeople] = useState(false);
  const [people, setPeople] = useState<ChatProfile[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleLoaded, setPeopleLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "requests" | "unread">("all");
  const [intro, setIntro] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => onSnapshot(doc(db, "users", user.uid), snap => {
    setProfile(snap.exists() ? { uid: user.uid, nome: String(snap.get("nome") || "Usuário"), tipoConta: snap.get("tipoConta"), companyStatus: snap.get("companyStatus") } : null);
  }, () => setError("Não foi possível carregar sua conta.")), [user.uid]);

  useEffect(() => subscribeConversations(user.uid, list => { setChats(list); setLoading(false); }, () => {
    setError("Não foi possível abrir suas conversas. Confira sua conexão e a publicação das regras do Firestore."); setLoading(false);
  }), [user.uid]);

  useEffect(() => {
    let active = true;
    const ids = [...new Set(chats.flatMap(chat => chat.members))].filter(id => id !== user.uid && !cached.current[id]);
    void Promise.all(ids.map(async id => {
      try { return await getChatProfile(id); }
      catch { return { uid: id, nome: "Conta indisponível", tipoConta: "" } as ChatProfile; }
    })).then(items => { if (active && items.length) { for (const p of items) cached.current[p.uid] = p; setProfiles({ ...cached.current }); } });
    return () => { active = false; };
  }, [chats, user.uid]);

  useEffect(() => {
    if (!requestedUid) return;
    let active = true;
    void getChatProfile(requestedUid).then(person => {
      const id = conversationId(user.uid, person.uid);
      if (active) { setTarget(person); setSelectedId(id); setShowPeople(false); }
    }).catch(() => { if (active) setError("Não foi possível abrir este contato."); });
    return () => { active = false; };
  }, [requestedUid, user.uid]);

  async function loadPeople() {
    if (peopleLoading) return;
    setPeopleLoading(true); setError("");
    try {
      const page = await findPeople(peopleLoaded ? cursor : null);
      setPeople(old => [...old, ...page.items.filter(p => !old.some(existing => existing.uid === p.uid))]);
      setCursor(page.nextCursor); setPeopleLoaded(true);
    } catch { setError("Não foi possível carregar as pessoas. Tente novamente."); }
    finally { setPeopleLoading(false); }
  }
  async function startConversation(event: React.FormEvent) {
    event.preventDefault();
    if (!target || creating) return;
    setCreating(true); setError("");
    try { const id = await requestConversation(target.uid, intro); setSelectedId(id); setIntro(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível enviar a solicitação."); }
    finally { setCreating(false); }
  }
  function selectPerson(person: ChatProfile) {
    setTarget(person); setSelectedId(conversationId(user.uid, person.uid)); setShowPeople(false); setIntro(""); setError("");
  }
  const chat = chats.find(item => item.id === selectedId);
  const otherId = chat?.members.find(id => id !== user.uid);
  const other = otherId ? profiles[otherId] || (target?.uid === otherId ? target : null) : target;
  const visibleChats = chats.filter(item => filter === "all" || (filter === "requests" ? item.status === "pending" && item.createdBy !== user.uid : isUnread(item, user.uid)));
  const eligiblePeople = people.filter(person => profile && canContact(profile, person) && `${person.nome} ${person.instituicao || ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));

  return <main className="min-h-[calc(100dvh-85px)] bg-[#edf6ff] p-3 text-slate-800 sm:p-6">
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#6585a2]">Sua rede de conexões</p><h1 className="mt-1 text-3xl font-black text-[#123a5a]">Mensagens</h1></div><Link href="/" className={secondary}>← Página inicial</Link></div>
      {error && <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <div className="grid overflow-hidden rounded-3xl border border-[#dfeeff] bg-white shadow-sm md:grid-cols-[300px_minmax(0,1fr)]">
        <aside aria-label="Caixa de entrada" className={`border-r border-[#edf3ff] p-4 ${selectedId && !showPeople ? "hidden md:block" : ""}`}>
          <button type="button" className={`${primary} w-full`} onClick={() => { setShowPeople(true); setSelectedId(""); if (!peopleLoaded) void loadPeople(); }}>+ Nova conversa</button>
          <div className="my-4 flex flex-wrap gap-1" aria-label="Filtrar conversas">{([ ["all", "Todas"], ["requests", "Solicitações"], ["unread", "Não lidas"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-full px-2.5 py-2 text-xs font-semibold ${filter === value ? "bg-[#edf6ff] text-[#123a5a]" : "text-slate-500"}`}>{label}</button>)}</div>
          {loading ? <p role="status" className="p-4 text-sm text-slate-500">Carregando conversas...</p> : visibleChats.length === 0 ? <p className="p-4 text-sm leading-6 text-slate-500">{filter === "all" ? "Sua próxima conexão começa aqui. Escolha alguém em Nova conversa." : "Nenhuma conversa neste filtro."}</p> : <ul className="max-h-[65dvh] space-y-1 overflow-y-auto">{visibleChats.map(item => {
            const personId = item.members.find(id => id !== user.uid)!;
            const name = profiles[personId]?.nome || "Carregando contato...";
            const unread = isUnread(item, user.uid);
            return <li key={item.id}><button type="button" aria-current={selectedId === item.id ? "true" : undefined} onClick={() => { setSelectedId(item.id); setTarget(null); setShowPeople(false); }} className={`w-full rounded-2xl p-3 text-left transition ${selectedId === item.id ? "bg-[#edf6ff]" : "hover:bg-slate-50"}`}><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold text-[#123a5a]">{name}</span>{unread && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500"><span className="sr-only">Não lida</span></span>}</span><span className="mt-1 block truncate text-xs text-slate-500">{item.blockedBy.length ? "Conversa bloqueada" : item.status === "pending" ? item.createdBy === user.uid ? "Solicitação enviada" : "Quer conversar com você" : item.status === "declined" ? "Solicitação recusada" : item.lastMessage}</span></button></li>;
          })}</ul>}
        </aside>
        <section aria-label="Conversa" className={`min-w-0 ${!selectedId && !showPeople ? "hidden md:block" : ""}`}>
          {showPeople ? <div className="p-5 sm:p-8"><h2 className="text-xl font-black text-[#123a5a]">Encontre uma conexão</h2><p className="mt-2 text-sm leading-6 text-slate-500">Estudantes podem conversar entre si e com empresas aprovadas. O destinatário decide se aceita a conversa.</p><label className="mt-5 block text-sm font-semibold">Buscar por nome ou instituição<input type="search" value={search} onChange={event => setSearch(event.target.value)} className="mt-2 w-full rounded-xl border border-[#cfe8ff] px-4 py-3 font-normal" placeholder="Buscar nas pessoas carregadas" /></label>
            <ul className="mt-5 space-y-2">{eligiblePeople.map(person => <li key={person.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#edf3ff] p-4"><div className="min-w-0"><p className="break-words text-sm font-bold">{person.nome}</p><p className="text-xs text-slate-500">{person.tipoConta === "empresa" ? "Empresa aprovada" : person.instituicao || "Estudante"}</p></div><button type="button" className={secondary} onClick={() => selectPerson(person)}>Conversar</button></li>)}</ul>
            {peopleLoaded && !eligiblePeople.length && <p className="my-5 text-sm text-slate-500">Nenhum contato disponível nesta página. Carregue mais pessoas ou ajuste a busca.</p>}
            {(!peopleLoaded || cursor) && <button type="button" disabled={peopleLoading} onClick={() => void loadPeople()} className={`${secondary} mt-5`}>{peopleLoading ? "Carregando..." : "Carregar mais pessoas"}</button>}
            {profile?.tipoConta === "empresa" && profile.companyStatus !== "verified" && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Sua empresa precisa de aprovação administrativa para iniciar conversas.</p>}
          </div> : chat ? <ConversationView key={chat.id} chat={chat} userId={user.uid} other={other} self={profile} onBack={() => setSelectedId("")} /> : selectedId && target && !loading ? <form onSubmit={startConversation} className="p-5 sm:p-8"><button type="button" onClick={() => setSelectedId("")} className="mb-5 text-sm font-semibold text-[#123a5a]">← Voltar às conversas</button><h2 className="text-2xl font-black">Converse com {target.nome}</h2><p className="mt-3 text-sm leading-6 text-slate-500">Apresente-se e conte por que quer conversar. Você poderá enviar mais mensagens depois que a pessoa aceitar.</p><label className="mt-6 block text-sm font-semibold">Sua apresentação<textarea value={intro} onChange={event => setIntro(event.target.value)} maxLength={500} rows={4} required className="mt-2 w-full resize-y rounded-2xl border border-[#cfe8ff] p-4 font-normal" placeholder="Olá! Gostaria de conversar sobre..." /></label><p className="mt-2 text-right text-xs text-slate-400">{intro.length}/500</p><button type="submit" disabled={creating || !intro.trim() || !profile || !canContact(profile, target)} className={`${primary} mt-4`}>{creating ? "Enviando..." : "Enviar solicitação"}</button>{profile && !canContact(profile, target) && <p className="mt-4 text-sm text-amber-800">Este contato não está disponível. Empresas precisam de aprovação e só podem conversar com estudantes.</p>}</form> : <div className="flex min-h-[500px] flex-col items-center justify-center p-8 text-center"><span aria-hidden="true" className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#edf6ff] text-3xl">✉</span><h2 className="text-2xl font-black text-[#123a5a]">Boas conversas abrem caminhos</h2><p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">Escolha uma conversa ou encontre alguém da comunidade. Compartilhe ideias, projetos e oportunidades.</p><p className="mt-6 max-w-sm text-xs leading-5 text-slate-400">Evite compartilhar senhas, documentos ou dados bancários. Você pode bloquear e denunciar um contato a qualquer momento.</p></div>}
        </section>
      </div>
    </div>
  </main>;
}
