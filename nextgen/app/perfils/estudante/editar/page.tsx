"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { uploadResume, updateProfileDoc } from "@/services/perfil";

export default function EditarPerfilEstudante() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [skills, setSkills] = useState("");
  const [resumeLink, setResumeLink] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState("");
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
            const p: any = snap.data();
            setTitulo(p.titulo || "");
            setInstituicao(p.instituicao || "");
            setDescricao(p.descricao || "");
            setGithub(p.github || "");
            setLinkedin(p.linkedin || "");
            setPortfolio(p.portfolio || "");
            setResumeLink(p.resumeUrl || "");
            setSkills((p.skills && Array.isArray(p.skills)) ? p.skills.join(", ") : "");
          }
        } catch (err) {
          console.error("Erro ao carregar perfil:", err);
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
    if (!user) return;
    setMensagem("");

    const normalizedResumeLink = resumeLink.trim();
    if (normalizedResumeLink && !/^https?:\/\//i.test(normalizedResumeLink)) {
      setMensagem("Informe um link válido para o currículo, começando com http:// ou https://");
      return;
    }

    try {
      let resumeUrl: string | null = normalizedResumeLink || null;

      if (resumeFile) {
        const url = await uploadResume(user.uid, resumeFile, (p) => setUploadProgress(p));
        resumeUrl = url;
      }

      const data: any = {
        titulo,
        instituicao,
        descricao,
        github,
        linkedin,
        portfolio,
      };

      if (skills) {
        data.skills = skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      if (resumeUrl) data.resumeUrl = resumeUrl;

      await updateProfileDoc(user.uid, data);
      setMensagem("Perfil atualizado com sucesso.");
      router.push("/perfils/estudante");
    } catch (err) {
      console.error(err);
      setMensagem("Erro ao atualizar perfil.");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-8 text-slate-800">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-black text-[#123a5a] mb-4">Editar perfil</h1>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-sm border border-[#dfeeff]">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Título profissional / acadêmico</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Instituição</label>
            <input value={instituicao} onChange={(e) => setInstituicao(e.target.value)} className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Descrição</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">GitHub</label>
            <input type="url" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/seu-usuario" className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">LinkedIn</label>
            <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/seu-perfil" className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Portfólio</label>
            <input type="url" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://seuportfolio.com" className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Habilidades</label>
            <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="TypeScript, Next.js, UI/UX" className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Link do currículo (Drive, OneDrive, LinkedIn, etc.)</label>
            <input
              type="url"
              value={resumeLink}
              onChange={(e) => setResumeLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full rounded-2xl border border-[#cfe8ff] px-4 py-2 mt-2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Ou enviar currículo em PDF</label>
            <input type="file" accept="application/pdf" onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} className="mt-2" />
            {uploadProgress !== null && <p className="text-sm text-slate-600 mt-2">Upload: {uploadProgress}%</p>}
          </div>

          <div className="flex gap-3">
            <button type="submit" className="rounded-2xl bg-[#123a5a] text-white px-4 py-2">Salvar</button>
            <button type="button" onClick={() => router.push("/perfils/estudante")} className="rounded-2xl border border-[#cfe8ff] px-4 py-2">Cancelar</button>
          </div>

          {mensagem && <p className="text-sm text-slate-700 mt-2">{mensagem}</p>}
        </form>
      </div>
    </main>
  );
}
