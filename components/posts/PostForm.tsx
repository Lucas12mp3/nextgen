"use client";
import { useState } from "react";
import { createPost } from "@/services/posts";
import { auth } from "@/firebase/config";

type ProfileInfo = {
  nome?: string;
  tipoConta?: string | null;
  photoURL?: string | null;
  companyStatus?: string;
};

type Props = {
  onPublished?: () => void;
  profile?: ProfileInfo;
};

export default function PostForm({ onPublished, profile }: Props) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"post" | "vaga" | "evento">("post");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const canPublishJob = profile?.tipoConta === "empresa" && profile.companyStatus === "verified";

  async function publish() {
    if (loading) return;
    if (!auth.currentUser) {
      setFeedback({ type: "error", message: "Faça login para publicar." });
      return;
    }
    if (!text.trim()) {
      setFeedback({ type: "error", message: "Escreva uma mensagem antes de publicar." });
      return;
    }
    if (kind === "vaga" && !canPublishJob) {
      setFeedback({ type: "error", message: "A publicação de vagas é exclusiva de empresas aprovadas." });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      await createPost({
        authorId: auth.currentUser.uid,
        authorName: profile?.nome || auth.currentUser.displayName || "",
        authorPhotoURL: profile?.photoURL || auth.currentUser.photoURL || null,
        authorType: profile?.tipoConta || null,
        title: title.trim() || undefined,
        content: text.trim(),
        kind,
      });
      setTitle("");
      setText("");
      setFeedback({ type: "success", message: "Publicação enviada com sucesso." });
      if (onPublished) onPublished();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao publicar.";
      setFeedback({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[20px] border border-[#dfeeff] bg-white p-4 shadow-sm">
      <div className="mb-3 flex gap-2">
        {(["post", "vaga", "evento"] as const).filter(option => option !== "vaga" || canPublishJob).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={kind === option}
            onClick={() => setKind(option)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              kind === option ? "bg-[#123a5a] text-white" : "bg-[#edf7ff] text-[#123a5a]"
            }`}
          >
            {option === "post" ? "Post" : option === "vaga" ? "Vaga" : "Evento"}
          </button>
        ))}
      </div>

      <input
        aria-label="Título da publicação (opcional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da publicação (opcional)"
        className="mb-3 w-full rounded-2xl border border-[#dfeeff] bg-[#f9fcff] px-4 py-3 text-sm outline-none transition focus:border-[#9ad4ff]"
      />

      <textarea
        aria-label="Conteúdo da publicação"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Compartilhe oportunidades, eventos, projetos ou novidades..."
        rows={4}
        className="w-full rounded-2xl border border-[#dfeeff] bg-[#f9fcff] px-4 py-3 text-sm outline-none transition focus:border-[#9ad4ff]"
      />

      {feedback && (
        <p role={feedback.type === "error" ? "alert" : "status"} className={`mt-3 text-sm ${feedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
          {feedback.message}
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={publish}
          disabled={loading || !text.trim()}
          className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d2d46] disabled:opacity-50"
        >
          {loading ? "Publicando..." : "Publicar"}
        </button>
      </div>
    </div>
  );
}
