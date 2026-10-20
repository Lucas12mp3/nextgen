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
    <div className="rounded-md border p-3 bg-white">
      <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Cargo / Função" className="w-full rounded border px-2 py-1 mb-2" />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensagem para o candidato" className="w-full rounded border px-2 py-1 mb-2" />
        <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Requisitos da vaga (ex.: habilidades, localização, carga horária)" className="w-full rounded border px-2 py-1 mb-2" />
      {feedback && (
        <p className={`mt-3 text-sm ${feedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
          {feedback.message}
        </p>
      )}

      <div className="flex justify-end">
        <button onClick={handleSend} disabled={loading} className="rounded bg-[#123a5a] text-white px-3 py-1">{loading ? "Enviando..." : "Enviar proposta"}</button>
      </div>
    </div>
  );
}
