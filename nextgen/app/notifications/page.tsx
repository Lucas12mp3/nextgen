"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { subscribeUserProposals, markProposalRead, respondProposal } from "@/services/proposals";

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    let unsubProposals: any;
    if (user) {
      unsubProposals = subscribeUserProposals(user.uid, (list) => setItems(list));
    }
    return () => {
      unsub();
      if (unsubProposals) unsubProposals();
    };
  }, [user]);

  async function handleMarkRead(id: string) {
    await markProposalRead(id);
  }

  async function handleRespond(id: string, accept: boolean) {
    if (!user) return;
    try {
      await respondProposal(id, user.uid, accept);
    } catch (err: any) {
      alert(err.message || "Erro");
    }
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Notificações / Propostas</h1>
      {items.length === 0 ? (
        <div>Nenhuma proposta encontrada.</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="rounded border p-3 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <strong>{it.fromCompanyName}</strong>
                  <div className="text-sm text-slate-600">Cargo: {it.role}</div>
                  <p className="mt-2">{it.message}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => handleRespond(it.id, true)} className="rounded bg-green-600 text-white px-3 py-1">Aceitar</button>
                  <button onClick={() => handleRespond(it.id, false)} className="rounded bg-red-100 text-red-700 px-3 py-1">Rejeitar</button>
                  <button onClick={() => handleMarkRead(it.id)} className="rounded bg-gray-100 px-2 py-1 text-sm">Marcar lida</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
