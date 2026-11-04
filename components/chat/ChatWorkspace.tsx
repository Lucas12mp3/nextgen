"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { canContact, conversationId, findPeople, getChatProfile, isUnread, requestConversation, subscribeConversations, type ChatProfile, type Conversation, type Friendship } from "@/services/chat";
import { subscribeFriendships } from "@/services/social";
import ConversationView from "./ConversationView";
import ChatPrivacy from "./ChatPrivacy";
import FriendsPanel from "./FriendsPanel";
import FriendshipControls from "./FriendshipControls";

const primary = "rounded-full bg-[#123a5a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#20557e] disabled:opacity-50";
const secondary = "rounded-full border border-[#cfe8ff] bg-white px-4 py-2.5 text-sm font-semibold text-[#123a5a] disabled:opacity-50";

export default function ChatWorkspace() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => onAuthStateChanged(auth, current => { setUser(current); setReady(true); }), []);
  if (!ready) return <main className="p-8 text-center" role="status">Verificando sua conta...</main>;
  if (!user) return <main className="mx-auto max-w-xl p-8 text-center"><h1 className="text-3xl font-black">Suas conversas, em um só lugar</h1><p className="my-5 text-slate-600">Entre para conversar com estudantes e empresas da comunidade.</p><Link href="/login" className={primary}>Entrar para conversar</Link></main>;
  return <Inbox key={`${user.uid}:${searchParams.toString()}`} user={user} />;
}

function Inbox({ user }: { user: User }) {
  const params = useSearchParams();
  const requestedUid = params.get("to");
  const requestedView = params.get("view");
  const [profile, setProfile] = useState<ChatProfile | null>(null);
  const [profileState, setProfileState] = useState<"loading" | "ready" | "missing" | "invalid" | "error">("loading");
  const [chats, setChats] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [target, setTarget] = useState<ChatProfile | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ChatProfile>>({});
  const cached = useRef<Record<string, ChatProfile>>({});
  const [error, setError] = useState("");
  const [showPeople, setShowPeople] = useState(false);
  const [showFriends, setShowFriends] = useState(requestedView === "friends");
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [people, setPeople] = useState<ChatProfile[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleLoaded, setPeopleLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "requests" | "unread">("all");
  const [intro, setIntro] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => onSnapshot(doc(db, "users", user.uid), snap => {
    if (!snap.exists()) { setProfile(null); setProfileState("missing"); return; }
    const type = snap.get("tipoConta");
    if (!["estudante", "empresa"].includes(type)) { setProfile(null); setProfileState("invalid"); return; }
    setProfile({ uid: user.uid, nome: String(snap.get("nome") || "Usuário"), tipoConta: type, companyStatus: snap.get("companyStatus") });
    setProfileState("ready");
  }, () => { setProfile(null); setProfileState("error"); }), [user.uid]);

  useEffect(() => subscribeConversations(user.uid, list => { setChats(list); setLoading(false); }, () => {
    setError("Não foi possível abrir suas conversas. Confira sua conexão e a publicação das regras do Firestore."); setLoading(false);
  }), [user.uid]);
  useEffect(() => subscribeFriendships(user.uid, list => { setFriendships(list); setFriendsLoading(false); }, () => {
    setFriendsLoading(false); setError("Não foi possível carregar as amizades. Confira a conexão e a publicação das regras do Firestore.");
  }), [user.uid]);

  useEffect(() => {
    let active = true;
    const ids = [...new Set([...chats, ...friendships].flatMap(item => item.members))].filter(id => id !== user.uid && !cached.current[id]);
    void Promise.all(ids.map(async id => {
      try { return await getChatProfile(id); }
      catch { return { uid: id, nome: "Conta indisponível", tipoConta: "" } as ChatProfile; }
    })).then(items => { if (active && items.length) { for (const p of items) cached.current[p.uid] = p; setProfiles({ ...cached.current }); } });
    return () => { active = false; };
  }, [chats, friendships, user.uid]);

  useEffect(() => {
    if (!requestedUid) return;
    let active = true;
    void getChatProfile(requestedUid).then(person => {
      const id = conversationId(user.uid, person.uid);
      if (active) { setTarget(person); setSelectedId(id); setShowPeople(false); setShowFriends(false); }
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
    setTarget(person); setSelectedId(conversationId(user.uid, person.uid)); setShowPeople(false); setShowFriends(false); setIntro(""); setError("");
  }
  function discoverPeople() { setShowPeople(true); setShowFriends(false); setSelectedId(""); if (!peopleLoaded) void loadPeople(); }
  const incomingFriends = friendships.filter(f => f.status === "pending" && f.requestedBy !== user.uid).length;
  const chat = chats.find(item => item.id === selectedId);
  const otherId = chat?.members.find(id => id !== user.uid);
  const other = otherId ? profiles[otherId] || (target?.uid === otherId ? target : null) : target;
  const visibleChats = chats.filter(item => filter === "all" || (filter === "requests" ? item.status === "pending" && item.createdBy !== user.uid : isUnread(item, user.uid)));
  const eligiblePeople = people.filter(person => profile && canContact(profile, person) && `${person.nome} ${person.instituicao || ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));

  if (profileState === "loading") return <main className="mx-auto max-w-3xl p-8 text-center"><h1 className="text-2xl font-black text-[#123a5a]">Mensagens</h1><p role="status" className="mt-5">Carregando seu perfil...</p><Link href="/" className={`${secondary} mt-5 inline-block`}>Página inicial</Link></main>;
  if (profileState !== "ready") return <main className="min-h-[70dvh] bg-[#edf6ff] px-4 py-8 text-slate-800"><div className="mx-auto max-w-2xl rounded-3xl border border-[#dfeeff] bg-white p-6 sm:p-8"><h1 className="text-2xl font-black text-[#123a5a]">Seu perfil precisa de atenção</h1><div role="alert" className="my-5 space-y-3 text-sm leading-7"><p>{profileState === "missing" ? "Sua conta está conectada, mas o perfil desta conta não foi encontrado. Por isso não conseguimos mostrar os contatos disponíveis." : profileState === "invalid" ? "Sua conta está conectada, mas o tipo do perfil está incompleto. Para conversar, é necessário um perfil de estudante ou empresa." : "Não foi possível verificar seu perfil. Confira a conexão e tente novamente."}</p>{profileState !== "error" && <p>O acesso de administrador é separado do perfil de estudante ou empresa. Peça à administração para conferir o vínculo do cadastro.</p>}</div><div className="flex flex-wrap gap-3"><Link href="/privacidade#contato" className={primary}>Solicitar ajuda</Link><Link href="/" className={secondary}>Página inicial</Link><button type="button" onClick={() => window.location.reload()} className={secondary}>Tentar novamente</button></div></div></main>;

  return <main className="min-h-[calc(100dvh-85px)] bg-[#edf6ff] p-3 text-slate-800 sm:p-6">
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#6585a2]">Sua rede de conexões</p><h1 className="mt-1 text-3xl font-black text-[#123a5a]">Mensagens</h1></div><Link href="/" className={secondary}>← Página inicial</Link></div>
      {error && <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <ChatPrivacy />
      <div className="grid overflow-hidden rounded-3xl border border-[#dfeeff] bg-white shadow-sm md:grid-cols-[300px_minmax(0,1fr)]">
        <aside aria-label="Caixa de entrada" className={`border-r border-[#edf3ff] p-4 ${(selectedId || showFriends || showPeople) ? "hidden md:block" : ""}`}>
          <button type="button" className={`${primary} w-full`} onClick={discoverPeople}>+ Nova conversa</button>
          <button type="button" aria-pressed={showFriends} className={`${secondary} mt-3 w-full`} onClick={() => { setShowFriends(true); setShowPeople(false); setSelectedId(""); }}>Amigos {incomingFriends > 0 && <span className="ml-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs">{incomingFriends} {incomingFriends === 1 ? "pedido" : "pedidos"}</span>}</button>
          <div className="my-4 flex flex-wrap gap-1" aria-label="Filtrar conversas">{([ ["all", "Todas"], ["requests", "Solicitações"], ["unread", "Não lidas"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-full px-2.5 py-2 text-xs font-semibold ${filter === value ? "bg-[#edf6ff] text-[#123a5a]" : "text-slate-500"}`}>{label}</button>)}</div>
          {loading ? <p role="status" className="p-4 text-sm text-slate-500">Carregando conversas...</p> : visibleChats.length === 0 ? <p className="p-4 text-sm leading-6 text-slate-500">{filter === "all" ? "Sua próxima conexão começa aqui. Escolha alguém em Nova conversa." : "Nenhuma conversa neste filtro."}</p> : <ul className="max-h-[65dvh] space-y-1 overflow-y-auto">{visibleChats.map(item => {
            const personId = item.members.find(id => id !== user.uid)!;
            const name = profiles[personId]?.nome || "Carregando contato...";
            const unread = isUnread(item, user.uid);
            return <li key={item.id}><button type="button" aria-current={selectedId === item.id ? "true" : undefined} onClick={() => { setSelectedId(item.id); setTarget(null); setShowPeople(false); setShowFriends(false); }} className={`w-full rounded-2xl p-3 text-left transition ${selectedId === item.id ? "bg-[#edf6ff]" : "hover:bg-slate-50"}`}><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold text-[#123a5a]">{name}</span>{unread && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500"><span className="sr-only">Não lida</span></span>}</span><span className="mt-1 block truncate text-xs text-slate-500">{item.blockedBy.length ? "Conversa bloqueada" : item.status === "pending" ? item.createdBy === user.uid ? "Solicitação enviada" : "Quer conversar com você" : item.status === "declined" ? "Solicitação recusada" : item.lastMessage}</span></button></li>;
          })}</ul>}
        </aside>
        <section aria-label="Conversa e amigos" className={`min-w-0 ${!selectedId && !showPeople && !showFriends ? "hidden md:block" : ""}`}>
          {(showPeople || showFriends) && <button type="button" onClick={() => { setShowPeople(false); setShowFriends(false); }} className="m-4 mb-0 text-sm font-semibold text-[#123a5a] md:hidden">← Voltar às conversas</button>}
          {showFriends ? <FriendsPanel userId={user.uid} self={profile} friendships={friendships} profiles={profiles} loading={friendsLoading} blockedIds={chats.filter(c => c.blockedBy.length > 0).flatMap(c => c.members.filter(id => id !== user.uid))} onSelect={selectPerson} onDiscover={discoverPeople} /> : showPeople ? <div className="p-5 sm:p-8"><h2 className="text-xl font-black text-[#123a5a]">Encontre uma conexão</h2><p className="mt-2 text-sm leading-6 text-slate-500">Adicione amigos ou envie uma apresentação para conversar. O destinatário decide se aceita cada solicitação.</p><label className="mt-5 block text-sm font-semibold">Buscar por nome ou instituição<input type="search" value={search} onChange={event => setSearch(event.target.value)} className="mt-2 w-full rounded-xl border border-[#cfe8ff] px-4 py-3 font-normal" placeholder="Buscar nas pessoas carregadas" /></label>
            <ul className="mt-5 space-y-2">{eligiblePeople.map(person => <li key={person.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#edf3ff] p-4"><div className="min-w-0"><p className="break-words text-sm font-bold">{person.nome}</p><p className="text-xs text-slate-500">{person.tipoConta === "empresa" ? "Empresa aprovada" : person.instituicao || "Estudante"}</p></div><div className="flex flex-wrap items-center gap-2"><FriendshipControls userId={user.uid} otherId={person.uid} friendship={friendships.find(f => f.members.includes(person.uid))} disabled={friendsLoading} /><button type="button" className={secondary} onClick={() => selectPerson(person)}>Conversar</button></div></li>)}</ul>
            {peopleLoaded && !eligiblePeople.length && <p className="my-5 text-sm text-slate-500">Nenhum contato disponível nesta página. Carregue mais pessoas ou ajuste a busca.</p>}
            {(!peopleLoaded || cursor) && <button type="button" disabled={peopleLoading} onClick={() => void loadPeople()} className={`${secondary} mt-5`}>{peopleLoading ? "Carregando..." : "Carregar mais pessoas"}</button>}
            {profile?.tipoConta === "empresa" && profile.companyStatus !== "verified" && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Sua empresa precisa de aprovação administrativa para iniciar conversas.</p>}
          </div> : chat ? <ConversationView key={chat.id} chat={chat} userId={user.uid} other={other} self={profile} friendship={other ? friendships.find(f => f.members.includes(other.uid)) : undefined} friendsLoading={friendsLoading} onBack={() => setSelectedId("")} /> : selectedId && target && !loading ? <form onSubmit={startConversation} className="p-5 sm:p-8"><button type="button" onClick={() => setSelectedId("")} className="mb-5 text-sm font-semibold text-[#123a5a]">← Voltar às conversas</button><h2 className="text-2xl font-black">Converse com {target.nome}</h2><p className="mt-3 text-sm leading-6 text-slate-500">Apresente-se e conte por que quer conversar. Você poderá enviar mais mensagens depois que a pessoa aceitar.</p><label className="mt-6 block text-sm font-semibold">Sua apresentação<textarea value={intro} onChange={event => setIntro(event.target.value)} maxLength={500} rows={4} required className="mt-2 w-full resize-y rounded-2xl border border-[#cfe8ff] p-4 font-normal" placeholder="Olá! Gostaria de conversar sobre..." /></label><p className="mt-2 text-right text-xs text-slate-400">{intro.length}/500</p><button type="submit" disabled={creating || !intro.trim() || !profile || !canContact(profile, target)} className={`${primary} mt-4`}>{creating ? "Enviando..." : "Enviar solicitação"}</button>{profile && !canContact(profile, target) && <p className="mt-4 text-sm text-amber-800">Este contato não está disponível. Empresas precisam de aprovação e só podem conversar com estudantes.</p>}</form> : <div className="flex min-h-[500px] flex-col items-center justify-center p-8 text-center"><span aria-hidden="true" className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#edf6ff] text-3xl">✉</span><h2 className="text-2xl font-black text-[#123a5a]">Boas conversas abrem caminhos</h2><p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">Escolha uma conversa ou encontre alguém da comunidade. Compartilhe ideias, projetos e oportunidades.</p><p className="mt-6 max-w-sm text-xs leading-5 text-slate-400">Evite compartilhar senhas, documentos ou dados bancários. Você pode bloquear e denunciar um contato a qualquer momento.</p></div>}
        </section>
      </div>
    </div>
  </main>;
}
