"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, collection, query, where, onSnapshot } from "firebase/firestore";
import dynamic from "next/dynamic";
import StudentCard from "@/components/students/StudentCard";
import { RequireProfileType } from "@/components/auth/RequireProfileType";
import JobForm from "@/components/jobs/JobForm";
import { fecharVaga, subscribeVagasEmpresa, type Vaga } from "@/services/vagas";
import { subscribeRankingGeral, type RankingItem } from "@/services/desafios";

const JobModal = dynamic(() => import("@/components/jobs/JobModal"), { ssr: false });

function safeWebsite(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

type CompanyProfile = Record<string, unknown> & {
  nome?: string;
  tagline?: string;
  localizacao?: string;
  site?: string;
  linkedin?: string;
  descricao?: string;
};

type StudentSummary = Record<string, unknown> & {
  uid: string;
  nome?: string;
  instituicao?: string;
};

export default function PerfilEmpresaPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const companyPending = profile?.companyStatus !== "verified";
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [selectedJob, setSelectedJob] = useState<Vaga | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [error, setError] = useState("");
  const [closingJob, setClosingJob] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState<"all" | "aberta" | "fechada">("all");
  const [studentSearch, setStudentSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    let stopProfile: (() => void) | undefined;
    const unsub = onAuthStateChanged(auth, (u) => {
      stopProfile?.();
      setProfile(null);
      setUser(u);
      if (!u) {
        router.push("/login");
        return;
      }
      stopProfile = onSnapshot(doc(db, "users", u.uid), snap => {
        setProfile(snap.exists() ? snap.data() : null);
        setLoading(false);
      }, () => { setError("Não foi possível carregar o perfil da empresa. Atualize a página para tentar novamente."); setLoading(false); });
    });
    return () => { unsub(); stopProfile?.(); };
  }, [router]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeVagasEmpresa(user.uid, (items) => setVagas(items), () => setError("Não foi possível carregar suas vagas. Atualize a página para tentar novamente."));
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users"), where("tipoConta", "==", "estudante"));
    const unsub = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Record<string, unknown>) })) as StudentSummary[]);
    }, () => setError("Não foi possível carregar os estudantes."));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeRankingGeral((items) => setRanking(items), () => setError("Não foi possível carregar o ranking."));
    return () => unsub();
  }, [user]);

  async function handleFecharVaga(vagaId: string) {
    if (closingJob) return;
    setClosingJob(vagaId);
    setError("");
    try {
      await fecharVaga(vagaId);
      if (selectedJob?.id === vagaId) {
        setSelectedJob(null);
      }
    } catch {
      setError("Não foi possível fechar a vaga. Confira sua conexão e tente novamente.");
    } finally { setClosingJob(null); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  const featuredStudents = students.filter(student => `${student.nome || ""} ${student.instituicao || ""}`.toLocaleLowerCase("pt-BR").includes(studentSearch.toLocaleLowerCase("pt-BR")))
    .sort((a, b) => (ranking.find(item => item.userId === b.uid)?.totalPontos ?? 0) - (ranking.find(item => item.userId === a.uid)?.totalPontos ?? 0) || (a.nome || "").localeCompare(b.nome || "", "pt-BR"));

  return (
    <RequireProfileType allowed="empresa">
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-4 text-slate-800 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[#567b9b]">Painel da empresa</p>
            <Link href="/" className="rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold text-[#123a5a]">← Página inicial</Link>
          </div>
          {error && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
          <div className="relative overflow-hidden rounded-[20px] border border-[#dfeeff] bg-white p-6 shadow-md">
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="shrink-0">
                <div aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#123a5a] text-3xl font-black text-white">{(profile?.nome || "E").slice(0, 1).toUpperCase()}</div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#123a5a]">{profile?.nome || "Empresa"}</h1>
                <p className="text-sm text-slate-600">{profile?.tagline || "Conectando formação e mercado de trabalho"}</p>
                <p className="mt-2 text-sm text-slate-700">{profile?.localizacao || ""}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {safeWebsite(profile?.site) && <a href={safeWebsite(profile?.site)} target="_blank" rel="noopener noreferrer" className="text-sm text-[#123a5a] underline">Website ↗</a>}
                  {safeWebsite(profile?.linkedin) && <a href={safeWebsite(profile?.linkedin)} target="_blank" rel="noopener noreferrer" className="text-sm text-[#123a5a] underline">LinkedIn ↗</a>}
                  <Link href="/perfils/empresa/editar" className="rounded-full bg-[#123a5a] px-3 py-1 text-xs font-semibold text-white">Editar perfil</Link>
                  <Link href="/feed" className="rounded-full border border-[#cfe8ff] bg-[#f7fbff] px-3 py-1 text-xs font-semibold text-[#123a5a]">Ir para o feed</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[["Vagas abertas", vagas.filter(v => v.status === "aberta").length], ["Vagas publicadas", vagas.length], ["Situação da conta", profile?.companyStatus === "verified" ? "Aprovada" : profile?.companyStatus === "rejected" ? "Revisão necessária" : "Em análise"]].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#dfeeff] bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-[#123a5a]">{value}</p></div>)}
          </div>

          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#123a5a]">Sobre a empresa</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{profile?.descricao || "Conte um pouco sobre a empresa. Complete o perfil para apresentar sua atuação aos estudantes."}</p>
            </div>

            <div className="rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold text-[#123a5a]">Conecte-se com novos talentos</h3>
              <p className="mt-3 text-sm leading-6 text-slate-700">Acompanhe os estudantes, participe do feed e gerencie suas oportunidades em um só lugar.</p>
              <div className="mt-4 flex flex-wrap gap-2"><Link href="/notifications" className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white">Ver candidaturas</Link><Link href="/desafios" className="rounded-full border border-[#cfe8ff] px-4 py-2 text-sm font-semibold text-[#123a5a]">Gerenciar desafios</Link></div>
            </div>
          </section>

          <section className="mt-6 rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-[#123a5a]">Mural de vagas</h3>
              <Link href="/desafios" className="text-xs font-semibold text-[#123a5a] underline">Gerenciar desafios</Link>
            </div>
            {companyPending ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{profile?.companyStatus === "rejected" ? "A autorização da empresa foi recusada. A publicação de vagas, propostas e desafios depende de nova revisão administrativa." : "Sua empresa aguarda aprovação administrativa. A publicação de vagas, propostas e desafios fica bloqueada até a aprovação."}</p> : <JobForm />}
          </section>

          <section className="mt-6 rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#123a5a]">Vagas publicadas</h3>
            <div aria-label="Filtrar vagas" className="mt-4 flex flex-wrap gap-2">{([ ["all", "Todas"], ["aberta", "Abertas"], ["fechada", "Fechadas"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={jobFilter === value} onClick={() => setJobFilter(value)} className={`rounded-full px-4 py-2 text-xs font-semibold ${jobFilter === value ? "bg-[#123a5a] text-white" : "bg-[#edf6ff] text-[#123a5a]"}`}>{label}</button>)}</div>
            <div className="mt-4 space-y-3">
              {vagas.filter(v => jobFilter === "all" || v.status === jobFilter).length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#cfe8ff] bg-[#f7fbff] p-6 text-center text-sm text-slate-600">
                  {jobFilter === "all" ? "Você ainda não publicou vagas. Suas oportunidades aparecerão aqui." : "Nenhuma vaga nesta categoria."}
                </div>
              ) : (
                vagas.filter(v => jobFilter === "all" || v.status === jobFilter).map((vaga) => (
                  <article key={vaga.id} className="flex flex-col gap-3 rounded-lg border border-[#eaf4ff] p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="font-bold text-[#123a5a]">{vaga.titulo}</h4>
                      <p className="text-sm text-slate-600">
                        {vaga.local} • {vaga.modalidade} • {vaga.status === "aberta" ? "Aberta" : "Fechada"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelectedJob(vaga)} className="rounded-full bg-[#123a5a] px-3 py-1 text-xs font-semibold text-white">Ver</button>
                      <button type="button" onClick={() => handleFecharVaga(vaga.id)} disabled={vaga.status !== "aberta" || !!closingJob || companyPending} className="rounded-full border border-[#cfe8ff] px-3 py-1 text-xs font-semibold text-[#123a5a] disabled:cursor-not-allowed disabled:opacity-50">
                        {closingJob === vaga.id ? "Fechando..." : "Fechar vaga"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="mt-6 rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#123a5a]">Ranking por pontos</h3>
            <div className="mt-4 space-y-3">
              {ranking.length === 0 && <p className="text-sm text-slate-500">O ranking aparecerá quando os estudantes concluírem desafios.</p>}
              {ranking.slice(0, 5).map((item, index) => (
                <div key={item.userId} className="flex items-center justify-between gap-3 rounded-[16px] border border-[#eaf4ff] bg-[#f9fcff] p-3">
                  <div>
                    <p className="text-sm font-black text-[#123a5a]">#{index + 1} {item.nome}</p>
                    <p className="text-[11px] text-slate-500">{item.instituicao}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700">{item.totalPontos} pts</p>
                    <p className="text-[10px] text-slate-500">{item.desafiosConcluidos} desafios</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#123a5a]">Estudantes em destaque</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Conheça os talentos da comunidade e envie uma oportunidade diretamente a quem combina com sua empresa.</p>
            <label className="mt-4 block text-xs font-semibold text-[#123a5a]">Buscar por nome ou instituição<input type="search" value={studentSearch} onChange={event => setStudentSearch(event.target.value)} placeholder="Encontre um estudante" className="mt-2 w-full rounded-xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-3 text-sm font-normal" /></label>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {featuredStudents.length === 0 && <p className="text-sm text-slate-500">Nenhum estudante encontrado.</p>}
              {featuredStudents.slice(0, 6).map((s) => {
                const rankingData = ranking.find((item) => item.userId === s.uid);
                const position = ranking.findIndex((item) => item.userId === s.uid) + 1;
                return (
                  <StudentCard
                    key={s.uid}
                    student={s}
                    canPropose={profile?.companyStatus === "verified"}
                    challengeCount={rankingData?.desafiosConcluidos ?? 0}
                    totalPoints={rankingData?.totalPontos ?? 0}
                    rankingPosition={position > 0 ? position : undefined}
                  />
                );
              })}
            </div>
          </section>
        </div>

        {selectedJob && (
          <JobModal key={selectedJob.id}
            vaga={selectedJob}
            currentUserId={user?.uid ?? null}
            isStudent={false}
            onClose={() => setSelectedJob(null)}
          />
        )}
      </main>
    </RequireProfileType>
  );
}
