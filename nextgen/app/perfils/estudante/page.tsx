"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import ProposalForm from "@/components/proposals/ProposalForm";
import { sendApplication } from "@/services/applications";
type FeedItem = {
  id: number;
  type: "post" | "vaga" | "evento";
  author: string;
  role: string;
  time: string;
  title: string;
  content: string;
  badge: string;
  likes: number;
  comments: number;
  liked?: boolean;
};

const initialFeed: FeedItem[] = [
  {
    id: 1,
    type: "vaga",
    author: "NovaTech",
    role: "Empresa de TI",
    time: "há 2h",
    title: "Vaga: Estágio em Desenvolvimento Front-end",
    content: "Buscamos estudante de desenvolvimento para atuar com React, TypeScript e UX. Candidaturas até sexta.",
    badge: "Estágio",
    likes: 48,
    comments: 12,
    liked: false,
  },
  {
    id: 2,
    type: "post",
    author: "Ana Clara",
    role: "Estudante de Desenvolvimento",
    time: "há 5h",
    title: "Projeto em destaque",
    content: "Acabei de finalizar um dashboard de gestão para pequenas empresas. Estou muito feliz com o processo e com o feedback dos meus mentores.",
    badge: "Portfolio",
    likes: 64,
    comments: 18,
    liked: true,
  },
  {
    id: 3,
    type: "evento",
    author: "Campus Tech",
    role: "Evento",
    time: "amanhã",
    title: "Webinar: Carreira em Tecnologia para Jovens",
    content: "Uma conversa com profissionais da área sobre etapas de formação, networking e oportunidades em empresas de tecnologia.",
    badge: "Evento",
    likes: 31,
    comments: 9,
    liked: false,
  },
];

export default function PerfilEstudantePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [feed, setFeed] = useState<FeedItem[]>(initialFeed);
  const [tab, setTab] = useState<"feed" | "vagas" | "eventos">("feed");
  const [postText, setPostText] = useState("");
  const [postType, setPostType] = useState<"post" | "vaga" | "evento">("post");
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

  const filteredFeed =
    tab === "feed"
      ? feed
      : tab === "vagas"
      ? feed.filter((item) => item.type === "vaga")
      : feed.filter((item) => item.type === "evento");

  const toggleLike = (id: number) => {
    setFeed((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              liked: !item.liked,
              likes: item.liked ? item.likes - 1 : item.likes + 1,
            }
          : item
      )
    );
  };

  const publicar = () => {
    if (!postText.trim()) return;

    const novoItem: FeedItem = {
      id: Date.now(),
      type: postType,
      author: profile?.nome || user?.displayName || "Você",
      role: "Estudante",
      time: "agora",
      title:
        postType === "vaga"
          ? "Nova oportunidade compartilhada"
          : postType === "evento"
          ? "Convite para evento"
          : "Nova publicação",
      content: postText.trim(),
      badge: postType === "vaga" ? "Vaga" : postType === "evento" ? "Evento" : "Atualização",
      likes: 0,
      comments: 0,
      liked: false,
    };

    setFeed((current) => [novoItem, ...current]);
    setPostText("");
    setTab("feed");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-6 text-slate-800 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[22px] border border-[#dfeeff] bg-white p-5 shadow-[0_14px_38px_rgba(18,58,90,0.08)] md:p-6">
          <div className="absolute right-6 top-6 rounded-full bg-yellow-50/90 px-3 py-1 text-xs font-semibold text-yellow-800 ring-1 ring-yellow-100">Dados de exemplo — não reais</div>
          <div className="absolute left-6 top-6 h-28 w-full rounded-t-lg bg-gradient-to-r from-[#a9d6ff] to-[#dfeeff] opacity-50" />
          <div className="relative flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="rounded-full border border-[#cfe8ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#123a5a] transition hover:bg-[#f3f9ff]"
                >
                  ← Início
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {profile?.resumeUrl && (
                  <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#cfe8ff] bg-[#f7fbff] px-3 py-1.5 text-xs font-semibold text-[#123a5a] transition hover:bg-[#edf7ff]">
                    Visualizar currículo
                  </a>
                )}
                <Link href="/perfils/estudante/editar" className="rounded-full bg-[#123a5a] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0d2d46]">
                  Editar perfil
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="-mt-10 md:-mt-12">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-[#eaf6ff] text-3xl shadow-md">👩‍🎓</div>
              </div>

              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5d7b96]">Perfil acadêmico</p>
                <h1 className="text-2xl font-black text-[#123a5a] md:text-3xl">{profile?.nome || user?.displayName || "Perfil"}</h1>
                <p className="text-sm text-slate-600">{profile?.idadeText ?? (profile?.dataNascimento ? `${Math.max(0, (new Date().getFullYear() - new Date(profile.dataNascimento).getFullYear()))} anos` : "")}{profile?.instituicao ? ` • ${profile.instituicao}` : ""}</p>
                <p className="mt-2 text-sm text-slate-700">{profile?.descricao || "—"}</p>
                <div className="mt-3 flex flex-wrap gap-3 items-center">
                  <Link href={profile?.github || "#"} className="text-sm text-[#123a5a] underline">GitHub</Link>
                  <Link href={profile?.linkedin || "#"} className="text-sm text-[#123a5a] underline">LinkedIn</Link>
                  <Link href={profile?.portfolio || "#"} className="text-sm text-[#123a5a] underline">Portfólio</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[20px] border border-[#dfeeff] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf6ff] text-lg">👤</div>
                <div className="flex-1">
                  <p className="font-bold text-[#123a5a]">{profile?.nome || user?.displayName || "Você"}</p>
                  <p className="text-xs text-slate-500">Compartilhe uma atualização, vaga ou evento</p>
                </div>
              </div>

              <div className="mb-3 flex gap-2">
                {(["post", "vaga", "evento"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPostType(option)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      postType === option ? "bg-[#123a5a] text-white" : "bg-[#edf7ff] text-[#123a5a]"
                    }`}
                  >
                    {option === "post" ? "Post" : option === "vaga" ? "Vaga" : "Evento"}
                  </button>
                ))}
              </div>

              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Compartilhe oportunidades, eventos, projetos ou novidades..."
                rows={4}
                className="w-full rounded-2xl border border-[#dfeeff] bg-[#f9fcff] px-4 py-3 text-sm outline-none transition focus:border-[#9ad4ff]"
              />

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={publicar}
                  className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d2d46]"
                >
                  Publicar
                </button>
              </div>
            </div>

            <div className="rounded-[20px] border border-[#dfeeff] bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  { key: "feed", label: "Feed" },
                  { key: "vagas", label: "Vagas" },
                  { key: "eventos", label: "Eventos" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key as "feed" | "vagas" | "eventos")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      tab === item.key ? "bg-[#123a5a] text-white" : "bg-[#edf7ff] text-[#123a5a]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {filteredFeed.map((item) => (
                  <article key={item.id} className="rounded-[18px] border border-[#eaf1ff] bg-[#fbfdff] p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf6ff] text-sm font-bold text-[#123a5a]">
                          {item.author.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#123a5a]">{item.author}</p>
                          <p className="text-xs text-slate-500">{item.role} • {item.time}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#eaf6ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#123a5a]">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-[#123a5a]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.content}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#edf3ff] pt-3 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={() => toggleLike(item.id)}
                        className={`rounded-full px-2.5 py-1.5 font-semibold ${
                          item.liked ? "bg-[#dfeeff] text-[#123a5a]" : "bg-[#f3f8ff] text-slate-600"
                        }`}
                      >
                        {item.liked ? "♥ Curtido" : "♡ Curtir"} · {item.likes}
                      </button>
                      <button type="button" className="rounded-full bg-[#f3f8ff] px-2.5 py-1.5 font-semibold text-slate-600">
                        💬 Comentar · {item.comments}
                      </button>
                      <button type="button" className="rounded-full bg-[#f3f8ff] px-2.5 py-1.5 font-semibold text-slate-600">
                        ↗ Compartilhar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[20px] border border-[#dfeeff] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Resumo</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-xl bg-[#f5faff] px-3 py-2">
                  <span>Conexões</span>
                  <strong className="text-[#123a5a]">284</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#f5faff] px-3 py-2">
                  <span>Oportunidades</span>
                  <strong className="text-[#123a5a]">18</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#f5faff] px-3 py-2">
                  <span>Eventos próximos</span>
                  <strong className="text-[#123a5a]">5</strong>
                </div>
              </div>
            </div>

            {/* Proposal form - visible to companies viewing a estudante profile (hide for the profile owner) */}
            <div>
              {user && profile?.tipoConta === "estudante" && profile?.uid !== user.uid && (
                <ProposalForm toUserId={profile?.uid || user.uid} />
              )}
            </div>

            <div className="rounded-[20px] border border-[#dfeeff] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Minhas competências</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {['TypeScript', 'Next.js', 'UI/UX', 'Figma', 'Python', 'Inglês'].map((tag) => (
                  <span key={tag} className="rounded-full bg-[#eaf6ff] px-3 py-1 text-xs font-semibold text-[#123a5a]">{tag}</span>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-[#dfeeff] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Oportunidades em destaque</h3>
              <div className="mt-4 space-y-3">
                {[
                  { title: "Jovem Aprendiz - Marketing Digital", empresa: "BlueWave" },
                  { title: "Estágio em Tecnologia", empresa: "NovaTech" },
                  { title: "Programa de Formação em Dados", empresa: "Insight Lab" },
                ].map((vaga) => (
                  <div key={vaga.title} className="rounded-xl border border-[#edf3ff] bg-[#fbfdff] p-3">
                    <p className="font-semibold text-[#123a5a]">{vaga.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{vaga.empresa}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
