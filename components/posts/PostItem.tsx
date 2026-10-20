"use client";
import { useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { toggleLike, subscribeComments, addComment, editPost, deletePost, type PostRecord } from "@/services/posts";

type Props = {
  post: PostRecord;
  currentUid?: string | null;
  onDeleted?: () => void;
  onUpdated?: () => void;
};

function formatPostDate(value: unknown) {
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toLocaleString("pt-BR");
  }

  if (value instanceof Date) return value.toLocaleString("pt-BR");

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Recente" : parsed.toLocaleString("pt-BR");
  }

  return "Recente";
}

export default function PostItem({ post, currentUid, onDeleted, onUpdated }: Props) {
  const [liked, setLiked] = useState<boolean>(Array.isArray(post.likes) ? post.likes.includes(currentUid ?? "") : false);
  const [likesCount, setLikesCount] = useState<number>(post.likesCount ?? (Array.isArray(post.likes) ? post.likes.length : 0));
  const [comments, setComments] = useState<Array<Record<string, unknown> & { id: string; authorName?: string; content?: string }>>([]);
  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title ?? "");
  const [editText, setEditText] = useState(post.content ?? "");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const unsub = subscribeComments(post.id, (items) => setComments(items as Array<Record<string, unknown> & { id: string; authorName?: string; content?: string }>));
    return () => unsub();
  }, [post.id]);

  async function handleLike() {
    if (!auth.currentUser) {
      setFeedback({ type: "error", message: "Faça login para curtir." });
      return;
    }
    try {
      await toggleLike(post.id, auth.currentUser.uid);
      setLiked((v) => !v);
      setLikesCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
      setFeedback({ type: "success", message: "Curtida atualizada." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao curtir.";
      setFeedback({ type: "error", message });
    }
  }

  async function handleAddComment() {
    if (!auth.currentUser) {
      setFeedback({ type: "error", message: "Faça login para comentar." });
      return;
    }
    if (!commentText.trim()) {
      setFeedback({ type: "error", message: "Escreva um comentário antes de enviar." });
      return;
    }
    try {
      await addComment(post.id, {
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || "",
        content: commentText.trim(),
      });
      setCommentText("");
      setFeedback({ type: "success", message: "Comentário enviado." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao comentar.";
      setFeedback({ type: "error", message });
    }
  }

  async function handleEdit() {
    if (!auth.currentUser) {
      setFeedback({ type: "error", message: "Faça login para editar esta publicação." });
      return;
    }
    try {
      await editPost(post.id, auth.currentUser.uid, editTitle, editText.trim());
      setEditing(false);
      setFeedback({ type: "success", message: "Publicação atualizada." });
      if (onUpdated) onUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao editar.";
      setFeedback({ type: "error", message });
    }
  }

  async function handleDelete() {
    if (!auth.currentUser) {
      setFeedback({ type: "error", message: "Faça login para excluir a publicação." });
      return;
    }
    if (!window.confirm("Excluir publicação?")) return;
    try {
      await deletePost(post.id, auth.currentUser.uid);
      setFeedback({ type: "success", message: "Publicação excluída." });
      if (onDeleted) onDeleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao excluir.";
      setFeedback({ type: "error", message });
    }
  }

  return (
    <article className="rounded-[22px] border border-[#eaf1ff] bg-gradient-to-br from-[#ffffff] to-[#f9fbff] p-4 shadow-[0_14px_35px_rgba(25,74,120,0.06)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#dfeeff] to-[#bfe1ff] text-sm font-black text-[#123a5a]">
            {post.authorName?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-black text-[#123a5a]">{post.authorName}</p>
            <p className="text-xs text-slate-500">{post.authorType || "Usuário"} • {formatPostDate(post.createdAt)}</p>
          </div>
        </div>
        <span className="rounded-full bg-[#edf6ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#123a5a]">
          {post.kind === "vaga" ? "Vaga" : post.kind === "evento" ? "Evento" : "Atualização"}
        </span>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Título da publicação"
            className="w-full rounded-2xl border border-[#dfeeff] bg-[#f9fcff] px-3 py-2.5 text-sm outline-none transition focus:border-[#9ad4ff]"
          />
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full rounded-2xl border border-[#dfeeff] bg-[#f9fcff] p-3 text-sm outline-none transition focus:border-[#9ad4ff]" rows={4} />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">Cancelar</button>
            <button onClick={handleEdit} className="rounded-full bg-[#123a5a] px-3 py-1.5 text-sm font-semibold text-white">Salvar</button>
          </div>
        </div>
      ) : (
        <>
          {post.title && <h3 className="mt-4 text-lg font-black text-[#123a5a]">{post.title}</h3>}
          <p className="mt-2 text-sm leading-6 text-slate-700">{post.content}</p>
        </>
      )}

      {feedback && (
        <p className={`mt-3 text-sm ${feedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
          {feedback.message}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 border-t border-[#edf3ff] pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleLike} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${liked ? "bg-[#dfeeff] text-[#123a5a]" : "bg-[#f3f8ff] text-slate-600 hover:bg-[#edf6ff]"}`}>
            {liked ? "♥ Curtido" : "♡ Curtir"} · {likesCount}
          </button>
          <span className="rounded-full bg-[#f3f8ff] px-3 py-1.5 text-sm font-medium text-slate-600">💬 {comments.length}</span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Escreva um comentário..."
            className="w-full rounded-full border border-[#dfeeff] bg-[#f9fcff] px-3 py-2 text-sm outline-none transition focus:border-[#9ad4ff]"
          />
          <button onClick={handleAddComment} className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d2d46]">Enviar</button>
        </div>

        {currentUid === post.authorId && (
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(true)} className="rounded-full bg-[#f3f8ff] px-3 py-1.5 text-sm font-medium text-[#123a5a]">Editar</button>
            <button onClick={handleDelete} className="rounded-full bg-[#fdecea] px-3 py-1.5 text-sm font-medium text-red-600">Excluir</button>
          </div>
        )}
      </div>

      {comments.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-[#edf3ff] pt-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-2xl bg-[#f7fbff] p-2.5 text-sm">
              <strong className="text-xs font-bold uppercase tracking-[0.08em] text-[#123a5a]">{c.authorName}</strong>
              <div className="mt-1 text-sm text-slate-600">{c.content}</div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
