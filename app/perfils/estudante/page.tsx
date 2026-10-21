"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { RequireProfileType } from "@/components/auth/RequireProfileType";
import { calcularPontosDesafio, subscribeConquistas, subscribeRankingGeral, type Conquista, type RankingItem } from "@/services/desafios";

type StudentProfile = {
  nome?: string;
  titulo?: string;
  faixaEtaria?: string;
  instituicao?: string;
  descricao?: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
  resumeUrl?: string;
  skills?: string[];
  tipoConta?: string;
};

type PrivateStudentProfile = {
  dataNascimento?: string | Date;
};

export default function PerfilEstudantePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [privateProfile, setPrivateProfile] = useState<PrivateStudentProfile | null>(null);
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }

      setUser(u);

      const publicSnap = await getDoc(doc(db, "users", u.uid));
      const privateSnap = await getDoc(doc(db, "users", u.uid, "privado", "dados"));

      setProfile(publicSnap.exists() ? (publicSnap.data() as StudentProfile) : null);
      setPrivateProfile(privateSnap.exists() ? (privateSnap.data() as PrivateStudentProfile) : null);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = subscribeConquistas(user.uid, (items) => setConquistas(items));
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const unsub = subscribeRankingGeral((items) => setRanking(items));
    return () => unsub();
  }, []);

  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  const titulo = profile?.titulo || "Estudante";
  const totalPontos = conquistas.reduce(
    (soma, item) => soma + (typeof item.pontos === "number" ? item.pontos : calcularPontosDesafio(item.nivel, item.nota)),
    0
  );
  const posicaoRanking = ranking.findIndex((item) => item.userId === user?.uid) + 1;
  const idadeTexto =
    profile?.faixaEtaria ??
    (privateProfile?.dataNascimento
      ? `${Math.max(0, new Date().getFullYear() - new Date(privateProfile.dataNascimento).getFullYear())} anos`
      : "");

  const formatarData = (value: unknown) => {
    if (value && typeof value === "object" && "seconds" in value && typeof (value as { seconds?: number }).seconds === "number") {
      return new Date((value as { seconds: number }).seconds * 1000).toLocaleDateString("pt-BR");
    }

    if (value instanceof Date) {
      return value.toLocaleDateString("pt-BR");
    }

    return "Recente";
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <RequireProfileType allowed="estudante">
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-6 text-slate-800 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-[22px] border border-[#dfeeff] bg-white p-5 shadow-[0_14px_38px_rgba(18,58,90,0.08)] md:p-6">
            <div className="absolute left-6 top-6 h-24 w-full rounded-t-lg bg-gradient-to-r from-[#a9d6ff] to-[#dfeeff] opacity-50" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#eaf6ff] text-3xl shadow-md">👩‍🎓</div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5d7b96]">Perfil acadêmico</p>
                  <h1 className="text-2xl font-black text-[#123a5a] md:text-3xl">{profile?.nome || user?.displayName || "Perfil"}</h1>
                  <p className="text-sm text-slate-600">{titulo}</p>
                  <p className="text-sm text-slate-600">{idadeTexto}{profile?.instituicao ? ` • ${profile.instituicao}` : ""}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/feed" className="rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold text-[#123a5a] transition hover:bg-[#f5fbff]">Ir para o feed</Link>
                <Link href="/perfils/estudante/editar" className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d2d46]">Editar perfil</Link>
              </div>
            </div>
          </div>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[20px] border border-[#dfeeff] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-[#123a5a]">Sobre</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {profile?.descricao || "Adicione uma descrição para mostrar seu perfil, objetivos e experiências."}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {skills.length ? (
                  skills.map((skill: string) => (
                    <span key={skill} className="rounded-full bg-[#eaf6ff] px-3 py-1 text-xs font-semibold text-[#123a5a]">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Nenhuma habilidade cadastrada.</span>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {profile?.github && <a href={profile.github} target="_blank" rel="noreferrer" className="text-sm text-[#123a5a] underline">GitHub</a>}
                {profile?.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer" className="text-sm text-[#123a5a] underline">LinkedIn</a>}
                {profile?.portfolio && <a href={profile.portfolio} target="_blank" rel="noreferrer" className="text-sm text-[#123a5a] underline">Portfólio</a>}
                {profile?.resumeUrl && <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="text-sm text-[#123a5a] underline">Currículo</a>}
              </div>

              <div className="mt-6 rounded-[18px] border border-[#dfeeff] bg-[#f9fcff] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-[#123a5a]">Conquistas</h2>
                  <Link href="/desafios" className="text-xs font-semibold text-[#123a5a] underline">Ver desafios</Link>
                </div>
                {conquistas.length === 0 ? (
                  <p className="text-sm text-slate-600">Ainda não há conquistas conquistadas.</p>
                ) : (
                  <div className="space-y-2">
                    {conquistas.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-[#dfeeff] bg-white p-3">
                        <p className="text-sm font-black text-[#123a5a]">{item.desafioTitulo}</p>
                        <p className="text-xs text-slate-500">{item.empresaNome} • {item.nivel}</p>
                        <p className="mt-1 text-xs font-semibold text-emerald-700">Nota: {item.nota}%</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[20px] border border-[#dfeeff] bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-[#123a5a]">Dados do perfil</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>Título</span>
                    <span className="font-semibold text-[#123a5a]">{titulo}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Instituição</span>
                    <span className="font-semibold text-[#123a5a]">{profile?.instituicao || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Habilidades</span>
                    <span className="font-semibold text-[#123a5a]">{skills.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Pontos</span>
                    <span className="font-semibold text-emerald-700">{totalPontos} pts</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Ranking</span>
                    <span className="font-semibold text-[#123a5a]">{posicaoRanking > 0 ? `#${posicaoRanking}` : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Feed</span>
                    <Link href="/feed" className="font-semibold text-[#123a5a] underline">Abrir</Link>
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] border border-[#dfeeff] bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-[#123a5a]">Desafios concluídos</h2>
                  <span className="rounded-full bg-[#edf6ff] px-2.5 py-1 text-xs font-bold text-[#123a5a]">{conquistas.length}</span>
                </div>

                {conquistas.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#cfe8ff] bg-[#f7fbff] p-4 text-sm text-slate-600">
                    Nenhum desafio concluído ainda. <Link href="/desafios" className="font-semibold text-[#123a5a] underline">Explorar desafios</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conquistas.map((item) => (
                      <div key={item.id} className="rounded-[18px] border border-[#eaf4ff] bg-[#f9fcff] p-3">
                        <p className="text-sm font-black text-[#123a5a]">{item.desafioTitulo}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{item.empresaNome} • {item.nivel}</p>
                        <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                          <span className="font-semibold text-emerald-700">{typeof item.pontos === "number" ? `${item.pontos} pts` : `Nota: ${item.nota}%`}</span>
                          <span className="text-slate-500">{formatarData(item.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[20px] border border-[#dfeeff] bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-[#123a5a]">Ranking geral</h2>
                <div className="mt-4 space-y-3">
                  {ranking.slice(0, 5).map((item, index) => (
                    <div key={item.userId} className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${user?.uid === item.userId ? "border-[#9ad4ff] bg-[#edf8ff]" : "border-[#eaf4ff] bg-[#f9fcff]"}`}>
                      <div>
                        <p className="text-sm font-black text-[#123a5a]">#{index + 1} {item.nome}</p>
                        <p className="text-[11px] text-slate-500">{item.instituicao}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-700">{item.totalPontos} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </RequireProfileType>
  );
}
