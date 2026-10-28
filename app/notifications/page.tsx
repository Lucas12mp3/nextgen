"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { subscribeUserProposals, markProposalRead, respondProposal } from "@/services/proposals";
import { subscribeCompanyApplications, markApplicationRead, updateApplicationStatus } from "@/services/applications";
import { getResumeUrl } from "@/services/perfil";

type ProfileData = Record<string, unknown> & { tipoConta?: "estudante" | "empresa" };
type ProposalItem = Record<string, unknown> & { id: string; fromCompanyName?: string; role?: string; message?: string; read?: boolean; };
type ApplicationItem = Record<string, unknown> & { id: string; fromUserId?: string; fromUserName?: string; role?: string; status?: string; message?: string; read?: boolean; };

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

  async function handleOpenResume(studentUid?: string) {
    if (!studentUid) return;
    try { const url = await getResumeUrl(studentUid); window.open(url, "_blank", "noopener,noreferrer"); }
    catch (err) { alert(err instanceof Error ? err.message : "Não foi possível abrir o currículo."); }
  }

  async function handleApplicationStatus(id: string, status: string) {
    const normalizedStatus = status as "pending" | "reviewed" | "rejected" | "hired";
    await updateApplicationStatus(id, normalizedStatus);
  }

  const statusOptions = ["pending", "reviewed", "rejected", "hired"];

  const backHref = profile?.tipoConta === "empresa" ? "/perfils/empresa" : profile?.tipoConta === "estudante" ? "/perfils/estudante" : "/feed";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-6 text-slate-800 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Central de mensagens</p>
            <h1 className="mt-2 text-3xl font-black text-[#123a5a]">Notificações</h1>
          </div>
          <Link href={backHref} className="rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold text-[#123a5a] transition hover:bg-[#f5fbff]">
            Voltar
          </Link>
        </div>

        <div className="rounded-[24px] border border-[#dfeeff] bg-white p-5 shadow-sm">
          {profile?.tipoConta === "empresa" ? (
            <div>
              <h2 className="mb-3 text-xl font-bold text-[#123a5a]">Candidaturas recebidas</h2>
              {applications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#cfe8ff] bg-[#f7fbff] p-6 text-center text-sm text-slate-600">
                  Nenhuma candidatura encontrada.
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((it) => (
                    <div key={it.id} className="rounded-2xl border border-[#eaf4ff] bg-[#f9fcff] p-4">
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                        <div>
                          <strong className="text-[#123a5a]">{it.fromUserName || "Candidato"}</strong>
                          <div className="text-sm text-slate-600">Cargo: {it.role || "—"}</div>
                          <div className="text-sm text-slate-600">Status: {it.status || "pending"}</div>
                          <p className="mt-2 text-sm text-slate-700">{it.message}</p>
                        </div>
                        <div className="flex min-w-[150px] flex-col gap-2">
                          <button onClick={() => handleOpenResume(it.fromUserId)} className="rounded-full bg-[#123a5a] px-2 py-1.5 text-sm font-medium text-white">Ver currículo</button>
                          <button onClick={() => handleMarkApplicationRead(it.id)} className="rounded-full bg-slate-100 px-2 py-1.5 text-sm font-medium text-slate-700">Marcar lida</button>
                          <select
                            value={it.status || "pending"}
                            onChange={(e) => handleApplicationStatus(it.id, e.target.value)}
                            className="rounded-full border border-[#cfe8ff] bg-white px-2 py-1.5 text-sm text-slate-700"
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
              <h2 className="mb-3 text-xl font-bold text-[#123a5a]">Propostas recebidas</h2>
              {proposals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#cfe8ff] bg-[#f7fbff] p-6 text-center text-sm text-slate-600">
                  Nenhuma proposta encontrada.
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.map((it) => (
                    <div key={it.id} className="rounded-2xl border border-[#eaf4ff] bg-[#f9fcff] p-4">
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                        <div>
                          <strong className="text-[#123a5a]">{it.fromCompanyName}</strong>
                          <div className="text-sm text-slate-600">Cargo: {it.role}</div>
                          <p className="mt-2 text-sm text-slate-700">{it.message}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => handleRespond(it.id, true)} className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white">Aceitar</button>
                          <button onClick={() => handleRespond(it.id, false)} className="rounded-full bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700">Rejeitar</button>
                          <button onClick={() => handleMarkProposalRead(it.id)} className="rounded-full bg-slate-100 px-2 py-1.5 text-sm font-medium text-slate-700">Marcar lida</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
