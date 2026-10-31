"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import DesafioForm from "@/components/desafios/DesafioForm";
import { useChallengeAvailability } from "@/components/desafios/useChallengeAvailability";
import { fecharDesafio, subscribeConquistas, subscribeDesafiosAbertos, subscribeDesafiosEmpresa, type Conquista, type Desafio } from "@/services/desafios";

const card = "rounded-3xl border border-[#dfeeff] bg-white p-5 shadow-sm";
export default function DesafiosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ tipoConta: string; approved: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Desafio[]>([]);
  const [achievements, setAchievements] = useState<Conquista[]>([]);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState("");
  const closingLock = useRef(false);
  const available = useChallengeAvailability();
  useEffect(() => {
    let stopProfile: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, current => {
      stopProfile?.(); setUser(current); setProfile(null); setItems([]); setAchievements([]);
      if (!current) { setLoading(false); return; }
      setLoading(true);
      stopProfile = onSnapshot(doc(db, "users", current.uid), snapshot => {
        setProfile(snapshot.exists() ? { tipoConta: snapshot.get("tipoConta"), approved: snapshot.get("companyStatus") === "verified" } : null); setLoading(false);
      }, () => { setError("Não foi possível carregar seu perfil. Tente atualizar a página."); setLoading(false); });
    });
    return () => { stopAuth(); stopProfile?.(); };
  }, []);
  useEffect(() => {
    if (!user || !profile) return;
    const fail = () => setError("Não foi possível carregar os desafios. Confira sua conexão e se o site está atualizado.");
    const stop = profile.tipoConta === "empresa" ? subscribeDesafiosEmpresa(user.uid, setItems, fail) : subscribeDesafiosAbertos(setItems, fail);
    const stopAchievements = profile.tipoConta === "estudante" ? subscribeConquistas(user.uid, setAchievements, fail) : undefined;
    return () => { stop(); stopAchievements?.(); };
  }, [user, profile]);
  async function close(id: string) {
    if (closingLock.current) return;
    closingLock.current = true; setClosing(id); setError("");
    try { await fecharDesafio(id); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível fechar o desafio."); }
    finally { closingLock.current = false; setClosing(""); }
  }
  const company = profile?.tipoConta === "empresa";
  return <main className="min-h-screen bg-[#edf6ff] p-4 text-slate-800 sm:p-8"><div className="mx-auto max-w-6xl space-y-5">
    <header className={`${card} flex flex-wrap items-center justify-between gap-4`}><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Aprenda e mostre seu potencial</p><h1 className="mt-2 text-3xl font-black text-[#123a5a]">Desafios</h1></div><div className="flex gap-3"><Link href="/" className="rounded-full border border-[#cfe8ff] px-4 py-2 text-sm font-semibold">← Início</Link><Link href="/ranking" className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white">Ver ranking</Link></div></header>
    {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {available === false && <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">A publicação e a correção de desafios estão temporariamente indisponíveis. Seu histórico permanece disponível.</p>}
    {loading ? <p role="status" className={card}>Carregando desafios...</p> : !user ? <div className={card}><h2 className="text-xl font-bold">Desafios para seu próximo passo</h2><p className="my-4 text-sm text-slate-500">Entre para participar e acompanhar suas conquistas.</p><Link href="/login" className="font-semibold underline">Entrar na conta</Link></div> : !profile ? <p className={card}>Seu perfil não foi encontrado. Procure a administração.</p> : <div className={`grid items-start gap-5 ${company ? "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]" : "lg:grid-cols-[minmax(0,1fr)_300px]"}`}>
      {company && <section className={card}><h2 className="text-xl font-black">Criar desafio</h2>{!profile.approved && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Sua empresa precisa de aprovação administrativa para publicar desafios.</p>}<DesafioForm companyId={user.uid} enabled={profile.approved && available === true} /></section>}
      <section className={card}><h2 className="text-xl font-black">{company ? "Desafios publicados" : "Escolha seu próximo desafio"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{company ? "Ao fechar um desafio, novas participações são interrompidas e os resultados anteriores são preservados." : "Cada desafio permite uma tentativa válida. Confira todas as respostas antes de enviar."}</p><div className="mt-5 space-y-3">
        {items.length === 0 && <p className="rounded-2xl border border-dashed border-[#cfe8ff] p-5 text-sm text-slate-500">{company ? "Seus novos desafios publicados aparecerão aqui." : "Nenhum desafio disponível no momento."}</p>}
        {items.map(item => <article key={item.id} className="rounded-2xl border border-[#eaf4ff] bg-[#f9fcff] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-bold text-[#123a5a]">{item.titulo}</h3><p className="mt-1 text-xs text-slate-500">{item.empresaNome} · {item.area} · {item.nivel}</p></div><span className="shrink-0 rounded-full bg-[#eaf6ff] px-2 py-1 text-xs">{item.status === "aberto" ? "Aberto" : "Fechado"}</span></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.descricao}</p><p className="mt-3 text-xs font-semibold text-[#123a5a]">Nota mínima: {item.notaMinima}% · até {item.pontos} pontos</p><div className="mt-4 flex flex-wrap gap-3">{company ? item.status === "aberto" && <button type="button" disabled={!!closing || !profile.approved || !available} onClick={() => void close(item.id)} className="rounded-full border border-[#cfe8ff] px-4 py-2 text-xs font-semibold disabled:opacity-50">{closing === item.id ? "Fechando..." : "Fechar desafio"}</button> : <Link href={`/desafios/${item.id}`} className="rounded-full bg-[#123a5a] px-4 py-2 text-xs font-semibold text-white">{achievements.some(achievement => achievement.desafioId === item.id) ? "Ver resultado" : "Abrir desafio"}</Link>}</div></article>)}
      </div></section>
      {!company && <aside className={card}><h2 className="text-xl font-black">Minhas conquistas</h2><p className="mt-2 text-xs leading-5 text-slate-500">Resultados aprovados com correção verificada.</p><div className="mt-5 space-y-3">{achievements.length === 0 ? <p className="text-sm text-slate-500">Suas conquistas aparecerão aqui após a aprovação em um desafio.</p> : achievements.map(item => <Link key={item.id} href={`/desafios/${item.desafioId}`} className="block rounded-xl border border-[#dfeeff] p-3 hover:bg-sky-50"><p className="text-sm font-bold">{item.desafioTitulo}</p><p className="mt-1 text-xs text-slate-500">{item.empresaNome}</p><p className="mt-2 text-xs font-semibold text-emerald-700">Nota {item.nota}% · {item.pontos} pontos</p></Link>)}</div></aside>}
    </div>}
  </div></main>;
}
