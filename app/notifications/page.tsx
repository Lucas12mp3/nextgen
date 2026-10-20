"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { subscribeUserProposals, markProposalRead, respondProposal } from "@/services/proposals";
import { subscribeCompanyApplications, markApplicationRead, updateApplicationStatus } from "@/services/applications";

type ProfileData = Record<string, unknown> & { tipoConta?: "estudante" | "empresa" };
type ProposalItem = Record<string, unknown> & { id: string; fromCompanyName?: string; role?: string; message?: string; read?: boolean; };
type ApplicationItem = Record<string, unknown> & { id: string; fromUserName?: string; role?: string; status?: string; message?: string; read?: boolean; };

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);

  useEffect(() => {
    let unsubProposals: (() => void) | undefined;
    let unsubApplications: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (unsubProposals) unsubProposals();
      if (unsubApplications) unsubApplications();

      if (!u) {
        setUser(null);
        setProfile(null);
        setProposals([]);
        setApplications([]);
        return;
      }

      setUser(u);
      const snap = await getDoc(doc(db, "users", u.uid));
      const profileData = snap.exists() ? snap.data() : null;
      setProfile(profileData);

      if (profileData?.tipoConta === "estudante") {
        unsubProposals = subscribeUserProposals(u.uid, (list) => setProposals(list));
        setApplications([]);
      } else if (profileData?.tipoConta === "empresa") {
        unsubApplications = subscribeCompanyApplications(u.uid, (list) => setApplications(list));
        setProposals([]);
      } else {
        setProposals([]);
        setApplications([]);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProposals) unsubProposals();
      if (unsubApplications) unsubApplications();
    };
  }, []);

  async function handleMarkProposalRead(id: string) {
    await markProposalRead(id);
  }

  async function handleRespond(id: string, accept: boolean) {
    if (!user) return;
    try {
      await respondProposal(id, user.uid, accept);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro";
      alert(message);
    }
  }

  async function handleMarkApplicationRead(id: string) {
    await markApplicationRead(id);
  }

  async function handleApplicationStatus(id: string, status: string) {
    const normalizedStatus = status as "pending" | "reviewed" | "rejected" | "hired";
    await updateApplicationStatus(id, normalizedStatus);
  }

  const statusOptions = ["pending", "reviewed", "rejected", "hired"];

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Notificações</h1>

      {profile?.tipoConta === "empresa" ? (
        <div>
          <h2 className="text-xl font-semibold mb-3">Candidaturas recebidas</h2>
          {applications.length === 0 ? (
            <div>Nenhuma candidatura encontrada.</div>
          ) : (
            <div className="space-y-3">
              {applications.map((it) => (
                <div key={it.id} className="rounded border p-3 bg-white">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <strong>{it.fromUserName || "Candidato"}</strong>
                      <div className="text-sm text-slate-600">Cargo: {it.role || "—"}</div>
                      <div className="text-sm text-slate-600">Status: {it.status || "pending"}</div>
                      <p className="mt-2">{it.message}</p>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[150px]">
                      <button onClick={() => handleMarkApplicationRead(it.id)} className="rounded bg-gray-100 px-2 py-1 text-sm">Marcar lida</button>
                      <select
                        value={it.status || "pending"}
                        onChange={(e) => handleApplicationStatus(it.id, e.target.value)}
                        className="rounded border px-2 py-1 text-sm"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-3">Propostas recebidas</h2>
          {proposals.length === 0 ? (
            <div>Nenhuma proposta encontrada.</div>
          ) : (
            <div className="space-y-3">
              {proposals.map((it) => (
                <div key={it.id} className="rounded border p-3 bg-white">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <strong>{it.fromCompanyName}</strong>
                      <div className="text-sm text-slate-600">Cargo: {it.role}</div>
                      <p className="mt-2">{it.message}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleRespond(it.id, true)} className="rounded bg-green-600 text-white px-3 py-1">Aceitar</button>
                      <button onClick={() => handleRespond(it.id, false)} className="rounded bg-red-100 text-red-700 px-3 py-1">Rejeitar</button>
                      <button onClick={() => handleMarkProposalRead(it.id)} className="rounded bg-gray-100 px-2 py-1 text-sm">Marcar lida</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
