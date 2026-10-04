"use client";
import { useState } from "react";
import { createPost } from "@/services/posts";
import { auth } from "@/firebase/config";

type Props = {
  onPublished?: () => void;
  profile?: any;
};

export default function PostForm({ onPublished, profile }: Props) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"post" | "vaga" | "evento">("post");
  const [loading, setLoading] = useState(false);

  async function publish() {
    if (!auth.currentUser) return alert("Faça login para publicar.");
    if (!text.trim()) return;
    setLoading(true);
    try {
      await createPost({
        authorId: auth.currentUser.uid,
        authorName: profile?.nome || auth.currentUser.displayName || "",
        authorPhotoURL: profile?.photoURL || auth.currentUser.photoURL || null,
        authorType: profile?.tipoConta || null,
        content: text.trim(),
        kind,
      });
      setText("");
      if (onPublished) onPublished();
    } catch (err: any) {
      alert(err.message || "Erro ao publicar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[20px] border border-[#dfeeff] bg-white p-4 shadow-sm">
      <div className="mb-3 flex gap-2">
        {(["post", "vaga", "evento"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setKind(option)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              kind === option ? "bg-[#123a5a] text-white" : "bg-[#edf7ff] text-[#123a5a]"
            }`}
          >
            {option === "post" ? "Post" : option === "vaga" ? "Vaga" : "Evento"}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Compartilhe oportunidades, eventos, projetos ou novidades..."
        rows={4}
        className="w-full rounded-2xl border border-[#dfeeff] bg-[#f9fcff] px-4 py-3 text-sm outline-none transition focus:border-[#9ad4ff]"
      />

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={publish}
          disabled={loading}
          className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d2d46] disabled:opacity-50"
        >
          {loading ? "Publicando..." : "Publicar"}
        </button>
      </div>
    </div>
  );
}
