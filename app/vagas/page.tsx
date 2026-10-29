"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import dynamic from "next/dynamic";
import { auth, db } from "@/firebase/config";
import { subscribeVagas, type Vaga } from "@/services/vagas";

const JobModal = dynamic(() => import("@/components/jobs/JobModal"), { ssr: false });

export default function VagasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profileType, setProfileType] = useState<string | null>(null);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [selectedVaga, setSelectedVaga] = useState<Vaga | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modality, setModality] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setProfileType(null);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
        setProfileType(typeof data?.tipoConta === "string" ? data.tipoConta : null);
      } catch {
        setProfileType(null);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    let stop: (() => void) | undefined;
    const unsub = onAuthStateChanged(auth, (u) => {
      stop?.(); setVagas([]); setError("");
      if (!u) { setLoading(false); return; }
      setLoading(true);
      stop = subscribeVagas((items) => { setVagas(items); setLoading(false); }, () => { setError("Não foi possível carregar as vagas. Confira sua conexão e tente novamente."); setLoading(false); });
    });
    return () => { unsub(); stop?.(); };
  }, []);

  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filteredVagas = vagas.filter(v => (!modality || v.modalidade === modality) && normalize([v.titulo, v.empresaNome, v.local].join(" ")).includes(normalize(search)));

  function formatDate(value: unknown) {
    if (typeof value === "object" && value !== null && "seconds" in value) {
      const seconds = Number((value as { seconds?: number }).seconds ?? 0);
      return new Date(seconds * 1000).toLocaleDateString("pt-BR");
    }

    if (value instanceof Date) return value.toLocaleDateString("pt-BR");

    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? "Hoje" : parsed.toLocaleDateString("pt-BR");
    }

    return "Hoje";
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-6 text-slate-800 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Oportunidades</p>
            <h1 className="mt-2 text-3xl font-black text-[#123a5a]">Vagas abertas</h1>
          </div>
          <Link href="/" className="rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold text-[#123a5a] transition hover:bg-[#f5fbff]">
            Voltar ao início
          </Link>
        </div>

        {user && <div className="mb-6 grid gap-3 rounded-2xl border border-[#dfeeff] bg-white p-4 sm:grid-cols-[1fr_200px]"><label className="text-sm font-semibold text-[#123a5a]">Buscar oportunidades<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cargo, empresa ou cidade" className="mt-2 w-full rounded-xl border border-[#cfe8ff] px-3 py-2 font-normal" /></label><label className="text-sm font-semibold text-[#123a5a]">Modalidade<select value={modality} onChange={e => setModality(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cfe8ff] px-3 py-2 font-normal"><option value="">Todas</option>{Array.from(new Set(vagas.map(v => v.modalidade))).sort().map(m => <option key={m}>{m}</option>)}</select></label></div>}
        {loading ? <p role="status" className="rounded-2xl bg-white p-8 text-center">Carregando vagas...</p> : !user ? <p className="rounded-2xl bg-white p-8 text-center">Entre na sua conta para consultar as oportunidades. <Link href="/login" className="font-semibold text-[#123a5a] underline">Entrar</Link></p> : error ? <div role="alert" className="rounded-2xl bg-red-50 p-8 text-red-700">{error}<button type="button" onClick={() => window.location.reload()} className="ml-3 underline">Tentar novamente</button></div> : filteredVagas.length === 0 ? (
          <div className="rounded-[20px] border border-[#dfeeff] bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-[#123a5a]">{vagas.length ? "Nenhuma vaga corresponde à busca." : "Nenhuma vaga aberta no momento."}</p>
            <p className="mt-2 text-sm text-slate-600">{vagas.length ? "Tente outro cargo, empresa, cidade ou modalidade." : "Volte em breve para acompanhar novas oportunidades."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVagas.map((vaga) => (
              <article key={vaga.id} className="rounded-[20px] border border-[#dfeeff] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#eaf6ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#123a5a]">
                        {vaga.modalidade}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                        Aberta
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-[#123a5a]">{vaga.titulo}</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">{vaga.empresaNome}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedVaga(vaga)}
                      className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f2f4d]"
                    >
                      Ver detalhes
                    </button>
                    {profileType === "estudante" ? (
                      <button
                        type="button"
                        onClick={() => setSelectedVaga(vaga)}
                        className="rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold text-[#123a5a] transition hover:bg-[#f5fbff]"
                      >
                        Candidatar-se
                      </button>
                    ) : (
                      <Link
                        href={user ? "/perfils/empresa" : "/login"}
                        className="rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold text-[#123a5a] transition hover:bg-[#f5fbff]"
                      >
                        {user ? "Perfil da empresa" : "Entrar para candidatar"}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                  <span>{vaga.local}</span>
                  <span>{vaga.modalidade}</span>
                  <span>{formatDate(vaga.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedVaga && (
        <JobModal key={selectedVaga.id}
          vaga={selectedVaga}
          currentUserId={user?.uid ?? null}
          isStudent={profileType === "estudante"}
          onClose={() => setSelectedVaga(null)}
          onApplied={() => setSelectedVaga(null)}
        />
      )}
    </main>
  );
}
