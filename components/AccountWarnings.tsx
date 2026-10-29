"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";

type Notice = { id: string; reason: string; readAt: unknown; date: string };
export default function AccountWarnings() {
  const [items, setItems] = useState<Notice[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [shown, setShown] = useState(25);
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    let stop: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, user => {
      stop?.(); setItems([]); setError(""); setHasMore(false);
      if (!user) return;
      stop = onSnapshot(query(collection(db, "users", user.uid, "advertencias"), orderBy("createdAt", "desc"), limit(shown)), snap => {
        setHasMore(snap.size >= shown);
        setItems(snap.docs.map(doc => ({ id: doc.id, reason: String(doc.get("reason") ?? ""), readAt: doc.get("readAt"), date: doc.get("createdAt")?.toDate?.().toLocaleString("pt-BR") ?? "Agora" })));
      }, () => setError("Não foi possível carregar os avisos da administração."));
    });
    return () => { unsubscribe(); stop?.(); };
  }, [shown]);
  async function acknowledge(id: string) {
    const uid = auth.currentUser?.uid;
    if (!uid || busy) return;
    setBusy(id); setError("");
    try { await updateDoc(doc(db, "users", uid, "advertencias", id), { readAt: serverTimestamp() }); }
    catch { setError("Não foi possível marcar o aviso como lido. Tente novamente."); }
    finally { setBusy(null); }
  }
  if (!items.length && !error) return null;
  return <section aria-label="Avisos da administração" className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
    <h2 className="text-lg font-bold text-amber-950">Avisos da administração</h2>
    <p className="mt-1 text-sm text-amber-900">Advertências orientam o uso da comunidade e ficam registradas no seu histórico. Elas não bloqueiam sua conta automaticamente.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <ul className="mt-4 space-y-3">{items.map(item => <li key={item.id} className="rounded-2xl bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-500">{item.date}</span><span className="text-xs font-bold text-amber-800">{item.readAt ? "Lido" : "Novo aviso"}</span></div>
      <p className="my-3 whitespace-pre-wrap break-words text-sm text-slate-800">{item.reason}</p>
      {!item.readAt && <button type="button" disabled={busy !== null} onClick={() => acknowledge(item.id)} className="rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === item.id ? "Salvando..." : "Marcar como lido"}</button>}
    </li>)}</ul>
    {hasMore && <button type="button" disabled={busy !== null} onClick={() => setShown(current => current + 25)} className="mt-4 rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950">Carregar avisos anteriores</button>}
  </section>;
}
