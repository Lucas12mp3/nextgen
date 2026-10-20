"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import dynamic from "next/dynamic";
import StudentCard from "@/components/students/StudentCard";
import { RequireProfileType } from "@/components/auth/RequireProfileType";
import JobForm from "@/components/jobs/JobForm";
import { fecharVaga, subscribeVagasEmpresa, type Vaga } from "@/services/vagas";

const JobModal = dynamic(() => import("@/components/jobs/JobModal"), { ssr: false });

type CompanyProfile = Record<string, unknown> & {
  nome?: string;
  tagline?: string;
  localizacao?: string;
  site?: string;
  linkedin?: string;
  resumeUrl?: string;
};

type StudentSummary = Record<string, unknown> & {
  uid: string;
  nome?: string;
  instituicao?: string;
  resumeUrl?: string;
};

export default function PerfilEmpresaPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [selectedJob, setSelectedJob] = useState<Vaga | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [challengeCounts, setChallengeCounts] = useState<Record<string, number>>({});
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      const snap = await getDoc(doc(db, "users", u.uid));
      setProfile(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeVagasEmpresa(user.uid, (items) => setVagas(items));
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const q = query(collection(db, "users"), where("tipoConta", "==", "estudante"));
    const unsub = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Record<string, unknown>) })) as StudentSummary[]);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!students.length) {
      setChallengeCounts({});
      return;
    }

    const unsubs = students.map((student) => {
      const q = query(collection(db, "conquistas"), where("userId", "==", student.uid));
      return onSnapshot(q, (snap) => {
        setChallengeCounts((prev) => ({
          ...prev,
          [student.uid]: snap.docs.length,
        }));
      });
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [students]);

  async function handleFecharVaga(vagaId: string) {
    try {
      await fecharVaga(vagaId);
      if (selectedJob?.id === vagaId) {
        setSelectedJob(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <RequireProfileType allowed="empresa">
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-8 text-slate-800">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-[20px] border border-[#dfeeff] bg-white p-6 shadow-md">
            <div className="relative flex items-center gap-6">
              <div className="-mt-8">
                <div className="h-20 w-20 rounded-2xl border-4 border-white bg-[#f7fbff] flex items-center justify-center text-3xl">💼</div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#123a5a]">{profile?.nome || "Empresa"}</h1>
                <p className="text-sm text-slate-600">{profile?.tagline || "Conectando formação e mercado de trabalho"}</p>
                <p className="mt-2 text-sm text-slate-700">{profile?.localizacao || ""}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link href={profile?.site || "#"} className="text-sm text-[#123a5a] underline">Website</Link>
                  <Link href={profile?.linkedin || "#"} className="text-sm text-[#123a5a] underline">LinkedIn</Link>
                  <Link href="/perfils/empresa/editar" className="rounded-full bg-[#123a5a] px-3 py-1 text-xs font-semibold text-white">Editar perfil</Link>
                  <Link href="/feed" className="rounded-full border border-[#cfe8ff] bg-[#f7fbff] px-3 py-1 text-xs font-semibold text-[#123a5a]">Ir para o feed</Link>
                  {profile?.resumeUrl && (
                    <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#cfe8ff] px-3 py-1 text-xs font-semibold text-[#123a5a]">Visualizar documento</a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#123a5a]">Sobre a empresa</h3>
              <p className="mt-3 text-sm text-slate-700">Empresa com cultura jovem, foco em formação e inovação.</p>
            </div>

            <div className="rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold text-[#123a5a]">Cultura & Valores</h3>
              <p className="mt-3 text-sm text-slate-700">Valorizamos aprendizado, mentoria e oportunidades para jovens aprendizes.</p>
            </div>
          </section>

          <section className="mt-6 rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-[#123a5a]">Mural de vagas</h3>
              <Link href="/desafios" className="text-xs font-semibold text-[#123a5a] underline">Gerenciar desafios</Link>
            </div>
            <JobForm />
          </section>

          <section className="mt-6 rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#123a5a]">Vagas publicadas</h3>
            <div className="mt-4 space-y-3">
              {vagas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#cfe8ff] bg-[#f7fbff] p-6 text-center text-sm text-slate-600">
                  Nenhuma vaga publicada ainda.
                </div>
              ) : (
                vagas.map((vaga) => (
                  <article key={vaga.id} className="flex flex-col gap-3 rounded-lg border border-[#eaf4ff] p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="font-bold text-[#123a5a]">{vaga.titulo}</h4>
                      <p className="text-sm text-slate-600">
                        {vaga.local} • {vaga.modalidade} • {vaga.status === "aberta" ? "Aberta" : "Fechada"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelectedJob(vaga)} className="rounded-full bg-[#123a5a] px-3 py-1 text-xs font-semibold text-white">Ver</button>
                      <button type="button" onClick={() => handleFecharVaga(vaga.id)} disabled={vaga.status !== "aberta"} className="rounded-full border border-[#cfe8ff] px-3 py-1 text-xs font-semibold text-[#123a5a] disabled:cursor-not-allowed disabled:opacity-50">
                        Fechar vaga
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="mt-6 rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#123a5a]">Estudantes em destaque</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {students.slice(0, 6).map((s) => (
                <StudentCard key={s.uid} student={s} canPropose challengeCount={challengeCounts[s.uid] ?? 0} />
              ))}
            </div>
          </section>
        </div>

        {selectedJob && (
          <JobModal
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
