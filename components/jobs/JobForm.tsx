"use client";

import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { criarVaga } from "@/services/vagas";

type JobFormProps = {
  onCreated?: () => void;
};

export default function JobForm({ onCreated }: JobFormProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [requisitos, setRequisitos] = useState("");
  const [modalidade, setModalidade] = useState("Presencial");
  const [local, setLocal] = useState("São Paulo, SP");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const user = auth.currentUser;

    if (!user) {
      setError("Você precisa estar autenticado como empresa para publicar uma vaga.");
      return;
    }

    const trimmedTitle = titulo.trim();
    const trimmedDescricao = descricao.trim();
    const trimmedRequisitos = requisitos.trim();

    if (!trimmedTitle || !trimmedDescricao || !trimmedRequisitos) {
      setError("Preencha o título, a descrição e os requisitos da vaga.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const snap = await getDoc(doc(db, "users", user.uid));
      const profile = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
      const empresaNome = typeof profile?.nome === "string" ? profile.nome : "Empresa";

      await criarVaga({
        empresaId: user.uid,
        empresaNome,
        titulo: trimmedTitle,
        descricao: trimmedDescricao,
        requisitos: trimmedRequisitos,
        modalidade,
        local,
        status: "aberta",
      });

      setTitulo("");
      setDescricao("");
      setRequisitos("");
      setModalidade("Presencial");
      setLocal("São Paulo, SP");
      setSuccess("Vaga publicada com sucesso.");
      onCreated?.();
    } catch (err) {
      console.error(err);
      setError((err as { code?: string }).code === "permission-denied" ? "Não foi possível publicar. Confirme a aprovação da empresa e a publicação das regras do Firestore." : err instanceof Error ? err.message : "Não foi possível publicar a vaga. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[18px] border border-[#dfeeff] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-[#123a5a]">Publicar nova vaga</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="md:col-span-2 block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Título da vaga</span>
          <input
            required
            maxLength={160}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none transition focus:border-[#9ad4ff]"
            placeholder="Analista de Marketing Jr."
          />
        </label>

        <label className="md:col-span-2 block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Descrição</span>
          <textarea
            required
            maxLength={5000}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none transition focus:border-[#9ad4ff]"
            placeholder="Descreva a oportunidade, responsabilidades e objetivos da função."
          />
        </label>

        <label className="md:col-span-2 block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Requisitos</span>
          <textarea
            required
            maxLength={3000}
            value={requisitos}
            onChange={(e) => setRequisitos(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none transition focus:border-[#9ad4ff]"
            placeholder="Ex.: Ensino médio completo, vontade de aprender, familiaridade com design, inglês básico."
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Modalidade</span>
          <select
            value={modalidade}
            onChange={(e) => setModalidade(e.target.value)}
            className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none transition focus:border-[#9ad4ff]"
          >
            <option value="Presencial">Presencial</option>
            <option value="Híbrido">Híbrido</option>
            <option value="Remoto">Remoto</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Local</span>
          <input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none transition focus:border-[#9ad4ff]"
            placeholder="São Paulo, SP"
          />
        </label>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {success && <p role="status" className="mt-3 text-sm text-emerald-600">{success}</p>}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#123a5a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f2f4d] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? "Publicando..." : "Publicar vaga"}
        </button>
      </div>
    </form>
  );
}
