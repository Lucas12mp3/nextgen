"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";

export default function PerfilEstudantePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      // load profile
      const snap = await getDoc(doc(db, "users", u.uid));
      setProfile(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-8 text-slate-800">
      <div className="mx-auto max-w-5xl">
        {/* Header do perfil */}
        <div className="relative overflow-hidden rounded-[20px] border border-[#dfeeff] bg-white p-6 shadow-md">
          <div className="absolute left-6 top-6 h-28 w-full rounded-t-lg bg-gradient-to-r from-[#a9d6ff] to-[#cfe8ff] opacity-40" />
          <div className="relative flex items-center gap-6">
            <div className="-mt-12">
              <div className="h-28 w-28 rounded-full border-4 border-white bg-[#eaf6ff] flex items-center justify-center text-3xl">👩‍🎓</div>
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#123a5a]">{profile?.nome || user?.displayName || 'Perfil'}</h1>
              <p className="text-sm text-slate-600">{profile?.idadeText ?? (profile?.dataNascimento ? `${Math.max(0, (new Date().getFullYear() - new Date(profile.dataNascimento).getFullYear()))} anos` : '')}{profile?.instituicao ? ` • ${profile.instituicao}` : ''}</p>
              <p className="mt-2 text-sm text-slate-700">{profile?.descricao || '—'}</p>
              <div className="mt-3 flex gap-3 items-center">
                <Link href={profile?.github || '#'} className="text-sm text-[#123a5a] underline">GitHub</Link>
                <Link href={profile?.linkedin || '#'} className="text-sm text-[#123a5a] underline">LinkedIn</Link>
                <Link href={profile?.portfolio || '#'} className="text-sm text-[#123a5a] underline">Portfólio</Link>
                <div className="ml-4">
                  <Link href="/perfils/estudante/editar" className="rounded-full bg-[#123a5a] px-3 py-1 text-xs font-semibold text-white">Editar perfil</Link>
                </div>
                {profile?.resumeUrl && (
                  <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="ml-2 rounded-full border border-[#cfe8ff] px-3 py-1 text-xs font-semibold text-[#123a5a]">Visualizar currículo</a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Formação e escola */}
        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#123a5a]">Formação & Escola</h3>
            <p className="mt-3 text-sm text-slate-700">CEDUP - Técnico em Desenvolvimento de Sistemas</p>
            <p className="text-sm text-slate-600">3º módulo • Conclusão prevista: Dez 2026</p>
          </div>

          {/* Competências */}
          <div className="rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-bold text-[#123a5a]">Competências & Hard Skills</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {['TypeScript','Next.js','Tailwind CSS','Figma','PostgreSQL','UML'].map(tag => (
                <button key={tag} className="rounded-full bg-[#eaf6ff] px-3 py-1 text-sm font-semibold text-[#123a5a]">{tag}</button>
              ))}
            </div>
          </div>
        </section>

        {/* Projetos */}
        <section className="mt-6">
          <h3 className="text-sm font-bold text-[#123a5a]">Projetos & Portfólio</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="rounded-lg border border-[#dfeeff] bg-white p-4 shadow-sm">
              <h4 className="font-bold text-[#123a5a]">LogiTrack Dashboard</h4>
              <p className="mt-2 text-sm text-slate-600">Dashboard para rastreamento de entregas com gráficos e autenticação.</p>
              <p className="mt-2 text-xs text-slate-500">Tecnologias: React, TypeScript, Chart.js</p>
              <div className="mt-3 flex gap-2">
                <Link href="#" className="rounded-full bg-[#123a5a] px-3 py-1 text-xs font-semibold text-white">Repositório</Link>
                <Link href="#" className="rounded-full border border-[#cfe8ff] px-3 py-1 text-xs font-semibold text-[#123a5a]">Demo</Link>
              </div>
            </article>

            <article className="rounded-lg border border-[#dfeeff] bg-white p-4 shadow-sm">
              <h4 className="font-bold text-[#123a5a]">NextGen (TCC)</h4>
              <p className="mt-2 text-sm text-slate-600">Protótipo da plataforma NextGen para conectar jovens a oportunidades.</p>
              <p className="mt-2 text-xs text-slate-500">Tecnologias: Next.js, Firebase, Tailwind</p>
              <div className="mt-3 flex gap-2">
                <Link href="#" className="rounded-full bg-[#123a5a] px-3 py-1 text-xs font-semibold text-white">Repositório</Link>
                <Link href="#" className="rounded-full border border-[#cfe8ff] px-3 py-1 text-xs font-semibold text-[#123a5a]">Demo</Link>
              </div>
            </article>
          </div>
        </section>

        {/* Cursos e certificados */}
        <section className="mt-6 rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[#123a5a]">Cursos Complementares & Certificados</h3>
          <ul className="mt-3 text-sm text-slate-700 space-y-2">
            <li>Curso de HTML e CSS — Platforma X (40h)</li>
            <li>Introdução ao TypeScript — Alura (16h)</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
