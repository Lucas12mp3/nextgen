"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { updateProfileDoc } from "@/services/perfil";

export default function EditarPerfilEmpresa() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [ramo, setRamo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [site, setSite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [tagline, setTagline] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      (async () => {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          if (snap.exists()) {
            const p = snap.data() as Record<string, unknown>;
            setNome(typeof p.nome === "string" ? p.nome : "");
            setRamo(typeof p.ramo === "string" ? p.ramo : "");
            setDescricao(typeof p.descricao === "string" ? p.descricao : "");
            setSite(typeof p.site === "string" ? p.site : "");
            setLinkedin(typeof p.linkedin === "string" ? p.linkedin : "");
            setTagline(typeof p.tagline === "string" ? p.tagline : "");
            setLocalizacao(typeof p.localizacao === "string" ? p.localizacao : "");
          }
        } catch (err) {
          console.error("Erro ao carregar perfil:", err);
          setLoadFailed(true);
          setMensagem("Não foi possível carregar seu perfil. Atualize a página para tentar novamente.");
        } finally {
          setLoading(false);
        }
      })();
    });
    return () => unsub();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || saving || loadFailed) return;
    setSaving(true);
    setMensagem("");
    try {

      const data: Record<string, string | null> = { nome, ramo, descricao, site, linkedin, tagline, localizacao };
      await updateProfileDoc(user.uid, data);
      setMensagem("Perfil atualizado com sucesso.");
      router.push("/perfils/empresa");
    } catch (err) {
      console.error(err);
      setMensagem("Não foi possível salvar o perfil. Confira sua conexão e tente novamente.");
    } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-4 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-black text-[#123a5a]">Editar perfil da empresa</h1>
          <div className="flex flex-wrap gap-3">
            <Link href="/feed" className="rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold text-[#123a5a] transition hover:bg-[#f5fbff]">
              Ir para o feed
            </Link>
            <Link href="/perfils/empresa" className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f2f4d]">
              Voltar ao perfil
            </Link>
          </div>
        </div>

        <p className="mb-5 text-sm leading-6 text-slate-600">Apresente sua empresa aos estudantes. Mantenha a descrição, os contatos e os links atualizados.</p>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-[#dfeeff] bg-white p-5 shadow-sm sm:p-8">
          <fieldset disabled={saving || loadFailed} className="space-y-4 disabled:opacity-60">
          <legend className="sr-only">Informações da empresa</legend>
          <div>
            <label htmlFor="company-field-1" className="block text-sm font-semibold text-slate-700">Nome da empresa</label>
            <input id="company-field-1" required maxLength={150} value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div>
            <label htmlFor="company-field-2" className="block text-sm font-semibold text-slate-700">Ramo</label>
            <input id="company-field-2" value={ramo} onChange={(e) => setRamo(e.target.value)} className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div>
            <label htmlFor="company-field-3" className="block text-sm font-semibold text-slate-700">Descrição</label>
            <textarea id="company-field-3" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div>
            <label htmlFor="company-field-4" className="block text-sm font-semibold text-slate-700">Frase de apresentação</label>
            <input id="company-field-4" value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div>
            <label htmlFor="company-field-5" className="block text-sm font-semibold text-slate-700">Localização</label>
            <input id="company-field-5" value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div>
            <label htmlFor="company-field-6" className="block text-sm font-semibold text-slate-700">Site</label>
            <input id="company-field-6" type="url" value={site} onChange={(e) => setSite(e.target.value)} className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div>
            <label htmlFor="company-field-7" className="block text-sm font-semibold text-slate-700">LinkedIn</label>
            <input id="company-field-7" type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving || loadFailed} className="rounded-2xl bg-[#123a5a] text-white px-4 py-2">{saving ? "Salvando..." : "Salvar"}</button>
            <button type="button" onClick={() => router.push("/perfils/empresa")} className="rounded-2xl border border-[#cfe8ff] px-4 py-2">Cancelar</button>
          </div>

          </fieldset>
          {mensagem && <p role="status" className="rounded-xl bg-[#edf6ff] p-4 text-sm text-slate-700">{mensagem}</p>}
        </form>
      </div>
    </main>
  );
}
