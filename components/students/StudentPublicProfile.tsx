"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { publicStudent, type PublicStudent } from "@/lib/student-portfolio";
import { canContact, getChatProfile, type ChatProfile } from "@/services/chat";
import StudentPortfolio from "./StudentPortfolio";

const button = "rounded-full border border-[#cfe8ff] bg-white px-4 py-2.5 text-sm font-semibold text-[#123a5a]";
export default function StudentPublicProfile({ studentId }: { studentId: string }) {
  const [user, setUser] = useState<User | null>(null), [ready, setReady] = useState(false);
  useEffect(() => onAuthStateChanged(auth, current => { setUser(current); setReady(true); }), []);
  return <main className="min-h-screen bg-[#edf6ff] p-4 text-slate-800 sm:p-8"><div className="mx-auto max-w-5xl">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-black text-[#123a5a]">Perfil do estudante</h1><div className="flex gap-2"><Link href="/" className={button}>← Início</Link>{user && <Link href="/feed" className={button}>Feed</Link>}</div></div>
    {!ready ? <p role="status">Verificando sua conta...</p> : !user ? <div className="rounded-2xl bg-white p-6"><p className="mb-4">Entre na sua conta para conhecer os estudantes da comunidade.</p><Link href="/login" className={button}>Entrar</Link></div> : <Profile key={`${user.uid}:${studentId}`} studentId={studentId} viewerId={user.uid} />}
  </div></main>;
}
function Profile({ studentId, viewerId }: { studentId: string; viewerId: string }) {
  const [profile, setProfile] = useState<PublicStudent | null>(null), [self, setSelf] = useState<ChatProfile | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!studentId || studentId.includes("/") || studentId.length > 128) throw new Error("Perfil não encontrado.");
      const snap = await getDoc(doc(db, "users", studentId));
      const data = snap.exists() ? publicStudent(studentId, snap.data()) : null;
      if (!data) throw new Error("Este perfil de estudante não está disponível.");
      if (active) { setProfile(data); setError(""); }
      const own = await getChatProfile(viewerId).catch(() => null);
      if (active) setSelf(own);
    }
    void load().catch(e => { if (active) setError((e as { code?: string }).code ? "Não foi possível carregar o perfil. Confira sua conexão e tente novamente." : e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId, viewerId, retry]);
  if (loading) return <p role="status">Carregando perfil...</p>;
  if (error || !profile) return <div role="alert" className="rounded-2xl bg-white p-6"><p>{error || "Perfil indisponível."}</p><button type="button" className={`${button} mt-4`} onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div>;
  const contact = self && canContact(self, { uid: studentId, nome: profile.nome, tipoConta: "estudante" });
  return <div className="space-y-5">
    <section className="rounded-3xl border border-[#dfeeff] bg-white p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div className="flex min-w-0 items-center gap-4"><span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#123a5a] text-2xl font-black text-white">{profile.nome.slice(0, 1).toUpperCase()}</span><div><h2 className="break-words text-2xl font-black text-[#123a5a]">{profile.nome}</h2><p className="mt-1 break-words text-sm text-slate-600">{profile.titulo || "Estudante"}</p><p className="mt-1 break-words text-sm text-slate-500">{profile.instituicao}</p></div></div><div className="flex flex-wrap gap-2">{viewerId === studentId ? <Link href="/perfils/estudante/editar" className={button}>Editar meu perfil</Link> : contact ? <Link href={`/mensagens?to=${encodeURIComponent(studentId)}`} className="rounded-full bg-[#123a5a] px-4 py-2.5 text-sm font-semibold text-white">Enviar mensagem</Link> : null}{self?.tipoConta === "empresa" && <Link href="/notifications" className={button}>Minhas candidaturas recebidas</Link>}</div></div>
      <h3 className="mt-7 font-bold">Sobre</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600 [overflow-wrap:anywhere]">{profile.descricao || "Este estudante ainda não adicionou uma descrição."}</p>
      <h3 className="mt-5 font-bold">Habilidades</h3><div className="mt-3 flex flex-wrap gap-2">{profile.skills.length ? profile.skills.map((skill, i) => <span key={`${i}-${skill}`} className="rounded-full bg-[#edf6ff] px-3 py-1.5 text-xs font-semibold">{skill}</span>) : <p className="text-sm text-slate-500">Nenhuma habilidade informada.</p>}</div>
      <div className="mt-5 flex flex-wrap gap-4">{([ ["GitHub", profile.github], ["LinkedIn", profile.linkedin], ["Portfólio", profile.portfolio] ] as const).map(([label, href]) => href && <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#2577bd] underline">{label} ↗</a>)}</div>
    </section>
    <StudentPortfolio key={studentId} userId={studentId} />
    <p className="text-xs leading-6 text-slate-500">Este perfil apresenta informações compartilhadas pelo estudante com a comunidade autenticada. O currículo fica disponível à empresa pelo fluxo de candidatura. <Link href="/privacidade" className="underline">Saiba como seus dados são usados.</Link></p>
  </div>;
}
