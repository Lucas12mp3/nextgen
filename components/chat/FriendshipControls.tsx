"use client";

import { useRef, useState } from "react";
import { answerFriendship, removeFriendship, requestFriendship } from "@/services/social";
import type { Friendship } from "@/services/chat-policy";

const button = "rounded-full border border-[#cfe8ff] bg-white px-3 py-2 text-xs font-semibold text-[#123a5a] hover:bg-sky-50 disabled:opacity-50";
export default function FriendshipControls({ userId, otherId, friendship, disabled = false }: {
  userId: string; otherId: string; friendship?: Friendship; disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const working = useRef(false);
  async function act(task: () => Promise<unknown>) {
    if (working.current) return;
    working.current = true; setBusy(true); setError("");
    try { await task(); }
    catch (err) { setError((err as { code?: string }).code === "permission-denied" ? "Ação indisponível. Confira bloqueios, aprovação da conta e a publicação das regras." : err instanceof Error ? err.message : "Não foi possível atualizar a amizade."); }
    finally { working.current = false; setBusy(false); }
  }
  return <div className="flex flex-wrap items-center gap-2">
    {!friendship ? <button type="button" disabled={busy || disabled} className={button} onClick={() => void act(() => requestFriendship(otherId))}>{busy ? "Enviando..." : "+ Adicionar amigo"}</button>
      : friendship.status === "accepted" ? <details className="relative"><summary className={`${button} cursor-pointer text-emerald-700`}>✓ Amigos</summary><button type="button" disabled={busy} className="mt-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800" onClick={() => void act(() => removeFriendship(friendship.id))}>Remover amizade</button></details>
      : friendship.status === "pending" ? friendship.requestedBy === userId ? <><span className="text-xs text-slate-500">Pedido enviado</span><button type="button" disabled={busy} className={button} onClick={() => void act(() => removeFriendship(friendship.id))}>Cancelar pedido</button></>
        : <><button type="button" disabled={busy || disabled} className={`${button} bg-sky-50`} onClick={() => void act(() => answerFriendship(friendship.id, true))}>Aceitar amizade</button><button type="button" disabled={busy || disabled} className={button} onClick={() => void act(() => answerFriendship(friendship.id, false))}>Recusar</button></>
      : <><span className="text-xs text-slate-500">Pedido recusado</span>{friendship.requestedBy !== userId && <button type="button" disabled={busy} className={button} onClick={() => void act(() => removeFriendship(friendship.id))}>Dispensar</button>}</>}
    {error && <p role="alert" className="w-full max-w-sm text-xs text-red-700">{error}</p>}
  </div>;
}
