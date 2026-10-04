"use client";
import { useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { toggleLike, subscribeComments, addComment, editPost, deletePost } from "@/services/posts";

type Props = {
  post: any;
  currentUid?: string | null;
  onDeleted?: () => void;
  onUpdated?: () => void;
};

export default function PostItem({ post, currentUid, onDeleted, onUpdated }: Props) {
  const [liked, setLiked] = useState<boolean>(Array.isArray(post.likes) ? post.likes.includes(currentUid) : false);
  const [likesCount, setLikesCount] = useState<number>(post.likesCount ?? (Array.isArray(post.likes) ? post.likes.length : 0));
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);

  useEffect(() => {
    const unsub = subscribeComments(post.id, (items) => setComments(items));
    return () => unsub();
  }, [post.id]);

  useEffect(() => {
    setLiked(Array.isArray(post.likes) ? post.likes.includes(currentUid) : false);
    setLikesCount(post.likesCount ?? (Array.isArray(post.likes) ? post.likes.length : 0));
  }, [post, currentUid]);

  async function handleLike() {
    if (!auth.currentUser) return alert("Faça login para curtir.");
    try {
      await toggleLike(post.id, auth.currentUser.uid);
      setLiked((v) => !v);
      setLikesCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    } catch (err: any) {
      alert(err.message || "Erro ao curtir");
    }
  }

  async function handleAddComment() {
    if (!auth.currentUser) return alert("Faça login para comentar.");
    if (!commentText.trim()) return;
    try {
      await addComment(post.id, {
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || "",
        content: commentText.trim(),
      });
      setCommentText("");
    } catch (err: any) {
      alert(err.message || "Erro ao comentar");
    }
  }

  async function handleEdit() {
    if (!auth.currentUser) return;
    try {
      await editPost(post.id, auth.currentUser.uid, editText.trim());
      setEditing(false);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.message || "Erro ao editar");
    }
  }

  async function handleDelete() {
    if (!auth.currentUser) return;
    if (!confirm("Excluir publicação?")) return;
    try {
      await deletePost(post.id, auth.currentUser.uid);
      if (onDeleted) onDeleted();
    } catch (err: any) {
      alert(err.message || "Erro ao excluir");
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
            <p className="text-xs text-slate-500">{post.authorType || ""} • {new Date(post.createdAt?.toDate?.() ?? post.createdAt ?? Date.now()).toLocaleString()}</p>
          </div>
        </div>
        <span className="rounded-full bg-[#eaf6ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#123a5a]">
          {post.kind === "vaga" ? "Vaga" : post.kind === "evento" ? "Evento" : "Atualização"}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-bold text-[#123a5a]">{post.title ?? ""}</h3>

      {editing ? (
        <div>
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full rounded border p-2" />
          <div className="mt-2 flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="rounded-full px-3 py-1.5 bg-gray-200">Cancelar</button>
            <button onClick={handleEdit} className="rounded-full px-3 py-1.5 bg-[#123a5a] text-white">Salvar</button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm leading-6 text-slate-600">{post.content}</p>
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
