"use client";

import { useEffect, useState } from "react";
import { hasUserAppliedToVaga, sendApplication } from "@/services/applications";
import type { Vaga } from "@/services/vagas";

type Props = {
  vaga: Vaga;
  currentUserId: string | null;
  isStudent?: boolean;
  onClose: () => void;
  onApplied?: () => void;
};

export default function JobModal({ vaga, currentUserId, isStudent = false, onClose, onApplied }: Props) {
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const userId = currentUserId;

    if (!userId || !isStudent || !vaga?.id) {
      return;
    }

    const safeUserId: string = userId;
    const safeVagaId: string = vaga.id;
    let cancelled = false;

    async function checkApplication() {
      try {
        const applied = await hasUserAppliedToVaga(safeUserId, safeVagaId);
        if (!cancelled) setAlreadyApplied(applied);
      } catch {
        if (!cancelled) setAlreadyApplied(false);
      }
    }

    checkApplication();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, isStudent, vaga?.id]);

  async function handleApply() {
    const userId = currentUserId;

    if (!userId) {
      setError("Você precisa entrar na sua conta antes de se candidatar.");
      return;
    }

    if (!isStudent) {
      setError("Você precisa entrar como estudante para se candidatar.");
      return;
    }

    const safeUserId: string = userId;

    if (alreadyApplied) {
      setMessage("Você já enviou uma candidatura para essa vaga.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      await sendApplication({
        fromUserId: safeUserId,
        toCompanyId: vaga.empresaId,
        toCompanyName: vaga.empresaNome,
        vagaId: vaga.id,
        role: vaga.titulo,
        message: `Candidatura para ${vaga.titulo}`,
        status: "pending",
      });

      setAlreadyApplied(true);
      setMessage("Candidatura enviada com sucesso!");
      onApplied?.();
    } catch (err) {
      console.error(err);
      setError("Não foi possível enviar sua candidatura. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-[22px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#123a5a]">{vaga.empresaNome}</p>
            <h2 className="mt-2 text-2xl font-black text-[#123a5a]">{vaga.titulo}</h2>
          </div>
          <button onClick={onClose} className="text-sm font-semibold text-slate-500">Fechar</button>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <span>{vaga.modalidade}</span>
          <span>{vaga.local}</span>
          <span>{vaga.status === "aberta" ? "Aberta" : "Fechada"}</span>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <h3 className="font-bold text-[#123a5a]">Descrição</h3>
            <p className="mt-2 text-sm leading-7 text-slate-700 whitespace-pre-line">{vaga.descricao}</p>
          </div>

          <div>
            <h3 className="font-bold text-[#123a5a]">Requisitos</h3>
            <p className="mt-2 text-sm leading-7 text-slate-700 whitespace-pre-line">{vaga.requisitos}</p>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-4 text-sm text-emerald-600">{message}</p>}

        <div className="mt-6 flex justify-end gap-3">
          {isStudent && (
            <button
              type="button"
              onClick={handleApply}
              disabled={submitting || alreadyApplied}
              className="rounded-full bg-[#123a5a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f2f4d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Enviando..." : alreadyApplied ? "Já candidatado" : "Candidatar-se"}
            </button>
          )}
          <button onClick={onClose} className="rounded-full border border-[#cfe8ff] bg-white px-5 py-2.5 text-sm font-semibold text-[#123a5a]">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
