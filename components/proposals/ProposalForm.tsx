"use client";
import { useState } from "react";
import { sendProposal } from "@/services/proposals";
import { auth } from "@/firebase/config";

type Props = {
  toUserId: string;
  onSent?: () => void;
};

export default function ProposalForm({ toUserId, onSent }: Props) {
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
   const [requirements, setRequirements] = useState("");
  const [loading, setLoading] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSend() {
    if (loading) return;
    if (!auth.currentUser) {
      setFeedback({ type: "error", message: "Faça login como empresa para enviar propostas." });
      return;
    }
    if (!role.trim() || !message.trim()) {
      setFeedback({ type: "error", message: "Preencha todos os campos." });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      await sendProposal({
        fromCompanyId: auth.currentUser.uid,
        fromCompanyName: auth.currentUser.displayName || "Empresa",
        toUserId,
        role: role.trim(),
        message: message.trim(),
        requirements: requirements.trim(),
      });
      setRole("");
      setMessage("");
      setRequirements("");
      setFeedback({ type: "success", message: "Proposta enviada com sucesso." });
      if (onSent) onSent();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao enviar proposta.";
      setFeedback({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl bg-[#f6fbff] p-4">
      <label className="block text-xs font-semibold text-[#123a5a]">Cargo ou função<input maxLength={160} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex.: Aprendiz em tecnologia" className="mt-2 w-full rounded-xl border border-[#cfe8ff] bg-white px-3 py-2.5 text-sm font-normal" /></label>
      <label className="block text-xs font-semibold text-[#123a5a]">Mensagem para o estudante<textarea maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Apresente a oportunidade e os próximos passos." className="mt-2 w-full rounded-xl border border-[#cfe8ff] bg-white px-3 py-2.5 text-sm font-normal" /></label>
      <label className="block text-xs font-semibold text-[#123a5a]">Requisitos (opcional)<textarea maxLength={2000} value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={2} placeholder="Habilidades, localização ou carga horária" className="mt-2 w-full rounded-xl border border-[#cfe8ff] bg-white px-3 py-2.5 text-sm font-normal" /></label>
      {feedback && (
        <p role={feedback.type === "error" ? "alert" : "status"} className={`mt-3 text-sm ${feedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
          {feedback.message}
        </p>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={handleSend} disabled={loading || !role.trim() || !message.trim()} className="rounded-full bg-[#123a5a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Enviando..." : "Enviar proposta"}</button>
      </div>
    </div>
  );
}
