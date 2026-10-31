"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/firebase/config";
import { subscribeRankingGeral, type RankingItem } from "@/services/desafios";

function getBadge(position: number) {
  if (position === 1) return "🥇 Top 1";
  if (position === 2) return "🥈 Top 2";
  if (position === 3) return "🥉 Top 3";
  if (position <= 10) return `🏅 Top ${position}`;
  return `#${position}`;
}

export default function RankingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      stop?.(); setUser(u); setRanking([]); setError("");
      if (!u) { setLoading(false); return; }
      setLoading(true);
      stop = subscribeRankingGeral(items => { setRanking(items); setLoading(false); }, () => { setError("Não foi possível carregar o ranking. Confira sua conexão e tente novamente."); setLoading(false); });
    });
    return () => { unsubAuth(); stop?.(); };
  }, []);

  const topThree = ranking.slice(0, 3);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-6 text-slate-800 md:p-8">
      <div className="mx-auto max-w-6xl">
        <p className="mb-5 rounded-2xl border border-[#dfeeff] bg-white p-4 text-sm leading-6 text-slate-600">O ranking considera conquistas com correção verificada. Cada desafio pontua uma vez. A classificação prioriza o total de pontos e, em caso de empate, a melhor nota.</p>
        <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-[#dfeeff] bg-white p-5 shadow-[0_18px_54px_rgba(18,58,90,0.08)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#6b8eb8]">NextGen</p>
            <h1 className="mt-2 text-3xl font-black text-[#123a5a]">Ranking de desafios</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/feed" className="rounded-full border border-[#cfe8ff] bg-[#f7fbff] px-4 py-2 text-sm font-semibold text-[#123a5a]">Ir para o feed</Link>
            <Link href="/desafios" className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white">Ver desafios</Link>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          {topThree.map((item, index) => (
            <div
              key={item.userId}
              className={`rounded-[22px] border p-5 shadow-sm ${
                index === 0
                  ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
                  : index === 1
                    ? "border-slate-200 bg-gradient-to-br from-slate-50 to-white"
                    : "border-orange-200 bg-gradient-to-br from-orange-50 to-white"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#123a5a]">{getBadge(index + 1)}</p>
              <h2 className="mt-4 text-2xl font-black text-[#123a5a]">{item.nome}</h2>
              <p className="mt-1 text-sm text-slate-600">{item.instituicao}</p>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/80 p-3">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Pontuação</span>
                <span className="text-xl font-black text-emerald-700">{item.totalPontos} pts</span>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[26px] border border-[#dfeeff] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b8eb8]">Classificação</p>
              <h2 className="mt-1 text-xl font-black text-[#123a5a]">Ranking completo</h2>
            </div>
            <span className="rounded-full bg-[#edf6ff] px-3 py-1.5 text-xs font-bold text-[#123a5a]">{ranking.length} estudantes</span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-[#cfe8ff] bg-[#f9fcff] p-8 text-center text-sm text-slate-600">Carregando ranking...</div>
          ) : !user ? <p className="rounded-2xl bg-[#f9fcff] p-8 text-center">Entre para acompanhar o ranking. <Link href="/login" className="font-semibold underline">Entrar</Link></p> : error ? <p role="alert" className="rounded-2xl bg-red-50 p-8 text-red-700">{error} <button type="button" onClick={() => window.location.reload()} className="underline">Tentar novamente</button></p> : ranking.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfe8ff] bg-[#f9fcff] p-8 text-center text-sm text-slate-600">Ainda não há estudantes no ranking.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#eaf4ff] text-[#123a5a]">
                    <th className="pb-3 pr-4 font-bold">Posição</th>
                    <th className="pb-3 pr-4 font-bold">Estudante</th>
                    <th className="pb-3 pr-4 font-bold">Instituição</th>
                    <th className="pb-3 pr-4 font-bold">Desafios</th>
                    <th className="pb-3 pr-4 font-bold">Melhor nota</th>
                    <th className="pb-3 font-bold">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((item, index) => {
                    const isCurrentUser = user?.uid === item.userId;

                    return (
                      <tr
                        key={item.userId}
                        className={`border-b border-[#f1f7ff] ${isCurrentUser ? "bg-[#edf8ff]" : "bg-white"}`}
                      >
                        <td className="py-3 pr-4 font-black text-[#123a5a]">{getBadge(index + 1)}</td>
                        <td className="py-3 pr-4">
                          <div className="font-bold text-[#123a5a]">{item.nome}</div>
                          {isCurrentUser && <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#123a5a]">Você</span>}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{item.instituicao}</td>
                        <td className="py-3 pr-4 text-slate-600">{item.desafiosConcluidos}</td>
                        <td className="py-3 pr-4 text-slate-600">{item.melhorNota}%</td>
                        <td className="py-3 font-black text-emerald-700">{item.totalPontos} pts</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
