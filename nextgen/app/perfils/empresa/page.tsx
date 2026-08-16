"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";

export default function PerfilEmpresaPage() {
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
        <div className="relative overflow-hidden rounded-[20px] border border-[#dfeeff] bg-white p-6 shadow-md">
          <div className="relative flex items-center gap-6">
            <div className="-mt-8">
              <div className="h-20 w-20 rounded-2xl border-4 border-white bg-[#f7fbff] flex items-center justify-center text-3xl">💼</div>
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#123a5a]">{profile?.nome || 'Empresa'}</h1>
              <p className="text-sm text-slate-600">{profile?.tagline || 'Conectando formação e mercado de trabalho'}</p>
              <p className="mt-2 text-sm text-slate-700">{profile?.localizacao || ''}</p>
              <div className="mt-3 flex gap-3 items-center">
                <Link href={profile?.site || '#'} className="text-sm text-[#123a5a] underline">Website</Link>
                <Link href={profile?.linkedin || '#'} className="text-sm text-[#123a5a] underline">LinkedIn</Link>
                <Link href="/perfils/empresa/editar" className="ml-4 rounded-full bg-[#123a5a] px-3 py-1 text-xs font-semibold text-white">Editar perfil</Link>
                {profile?.resumeUrl && (
                  <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="ml-2 rounded-full border border-[#cfe8ff] px-3 py-1 text-xs font-semibold text-[#123a5a]">Visualizar documento</a>
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

        {/* Mural de vagas */}
        <section className="mt-6 rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[#123a5a]">Mural de Vagas Abertas</h3>
          <div className="mt-4 space-y-3">
            <article className="flex items-center justify-between rounded-lg border border-[#eaf4ff] p-4">
              <div>
                <h4 className="font-bold text-[#123a5a]">Jovem Aprendiz - TI</h4>
                <p className="text-sm text-slate-600">São Paulo • Híbrido • Início imediato</p>
              </div>
              <div className="flex gap-2">
                <Link href="#" className="rounded-full bg-[#123a5a] px-3 py-1 text-xs font-semibold text-white">Ver</Link>
                <Link href="#" className="rounded-full border border-[#cfe8ff] px-3 py-1 text-xs font-semibold text-[#123a5a]">Candidatar</Link>
              </div>
            </article>

            <article className="flex items-center justify-between rounded-lg border border-[#eaf4ff] p-4">
              <div>
                <h4 className="font-bold text-[#123a5a]">Estágio em Marketing</h4>
                <p className="text-sm text-slate-600">Remoto • 6 meses • Bolsa auxílio</p>
              </div>
              <div className="flex gap-2">
                <Link href="#" className="rounded-full bg-[#123a5a] px-3 py-1 text-xs font-semibold text-white">Ver</Link>
                <Link href="#" className="rounded-full border border-[#cfe8ff] px-3 py-1 text-xs font-semibold text-[#123a5a]">Candidatar</Link>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
