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
    <article className="rounded-[18px] border border-[#eaf1ff] bg-[#fbfdff] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf6ff] text-sm font-bold text-[#123a5a]">
            {post.authorName?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-[#123a5a]">{post.authorName}</p>
            <p className="text-xs text-slate-500">{post.authorType || ""} • {formatPostDate(post.createdAt)}</p>
          </div>
        </div>
        <span className="rounded-full bg-[#eaf6ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#123a5a]">
          {post.kind === "vaga" ? "Vaga" : post.kind === "evento" ? "Evento" : "Atualização"}
        </span>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Título da publicação"
            className="w-full rounded border border-[#dfeeff] px-3 py-2 text-sm"
          />
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full rounded border border-[#dfeeff] p-2 text-sm" rows={4} />
          <div className="mt-2 flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="rounded-full px-3 py-1.5 bg-gray-200">Cancelar</button>
            <button onClick={handleEdit} className="rounded-full px-3 py-1.5 bg-[#123a5a] text-white">Salvar</button>
          </div>
        </div>
      ) : (
        <>
          {post.title && <h3 className="mt-4 text-lg font-bold text-[#123a5a]">{post.title}</h3>}
          <p className="mt-2 text-sm leading-6 text-slate-600">{post.content}</p>
        </>
      )}

      {feedback && (
        <p className={`mt-3 text-sm ${feedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
          {feedback.message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#edf3ff] pt-3 text-xs text-slate-500">
        <button onClick={handleLike} className={`rounded-full px-2.5 py-1.5 font-semibold ${liked ? "bg-[#dfeeff] text-[#123a5a]" : "bg-[#f3f8ff] text-slate-600"}`}>
          {liked ? "♥ Curtido" : "♡ Curtir"} · {likesCount}
        </button>
        <div className="flex items-center gap-2">
          <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Comentar..." className="rounded-full border px-3 py-1 text-sm" />
          <button onClick={handleAddComment} className="rounded-full bg-[#123a5a] px-3 py-1.5 text-white">Enviar</button>
        </div>

        {currentUid === post.authorId && (
          <div className="ml-auto flex gap-2">
            <button onClick={() => setEditing(true)} className="rounded-full bg-[#f3f8ff] px-2.5 py-1.5">Editar</button>
            <button onClick={handleDelete} className="rounded-full bg-[#fdecea] px-2.5 py-1.5 text-red-600">Excluir</button>
          </div>
        )}
      </div>

      {comments.length > 0 && (
        <div className="mt-3 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="rounded-md bg-[#f7fbff] p-2 text-sm">
              <strong className="text-xs text-[#123a5a]">{c.authorName}</strong>
              <div className="text-xs text-slate-600">{c.content}</div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
