"use client";
import Link from "next/link";
import AccountWarnings from "@/components/AccountWarnings";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { subscribeUserProposals, markProposalRead, respondProposal } from "@/services/proposals";
import { subscribeCompanyApplications, subscribeStudentApplications, markApplicationRead, updateApplicationStatus } from "@/services/applications";
import { openResumeInNewTab } from "@/services/perfil";

type ProfileData = Record<string, unknown> & { tipoConta?: "estudante" | "empresa" };
type ProposalItem = Record<string, unknown> & { id: string; fromCompanyName?: string; role?: string; message?: string; read?: boolean; };
type ApplicationItem = Record<string, unknown> & { id: string; fromUserId?: string; fromUserName?: string; role?: string; status?: string; message?: string; read?: boolean; };

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProposals: (() => void) | undefined;
    let unsubApplications: (() => void) | undefined;
    let active = true;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (unsubProposals) unsubProposals();
      if (unsubApplications) unsubApplications();

      if (!u) {
        setUser(null);
        setProfile(null);
        setProposals([]);
        setApplications([]);
        setLoading(false);
        return;
      }

      setUser(u);
      setActionError("");
      try {
      const snap = await getDoc(doc(db, "users", u.uid));
      if (!active || auth.currentUser?.uid !== u.uid) return;
      const profileData = snap.exists() ? snap.data() : null;
      setProfile(profileData);

      if (profileData?.tipoConta === "estudante") {
        unsubProposals = subscribeUserProposals(u.uid, (list) => setProposals(list), () => setActionError("Não foi possível carregar as propostas. Tente novamente."));
        unsubApplications = subscribeStudentApplications(u.uid, list => setApplications(list), () => setActionError("Não foi possível carregar suas candidaturas."));
      } else if (profileData?.tipoConta === "empresa") {
        if (profileData.companyStatus !== "verified") {
          setActionError("Sua empresa aguarda aprovação para receber candidaturas.");
          setApplications([]); setProposals([]); return;
        }
        unsubApplications = subscribeCompanyApplications(u.uid, (list) => setApplications(list), () => setActionError("Não foi possível carregar as candidaturas. Tente novamente."));
        setProposals([]);
      } else {
        setProposals([]);
        setApplications([]);
      }
      } catch { if (active) setActionError("Não foi possível carregar suas notificações. Confira sua conexão e tente novamente."); }
      finally { if (active) setLoading(false); }
    });

    return () => {
      active = false;
      unsubAuth();
      if (unsubProposals) unsubProposals();
      if (unsubApplications) unsubApplications();
    };
  }, []);

  async function handleMarkProposalRead(id: string) {
    try { setActionError(""); await markProposalRead(id); }
    catch { setActionError("Não foi possível marcar a proposta como lida. Tente novamente."); }
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
    try { setBusyId(id); setActionError(""); await markApplicationRead(id); }
    catch { setActionError("Não foi possível marcar a candidatura como lida. Tente novamente."); }
    finally { setBusyId(null); }
  }

  async function handleOpenResume(studentUid?: string) {
    if (!studentUid) return;
    try { setActionError(""); await openResumeInNewTab(studentUid); }
    catch (err) { setActionError(err instanceof Error ? err.message : "Não foi possível abrir o currículo."); }
  }

  async function handleApplicationStatus(id: string, status: string) {
    const normalizedStatus = status as "pending" | "reviewed" | "rejected" | "hired";
    try { setBusyId(id); setActionError(""); await updateApplicationStatus(id, normalizedStatus); }
    catch { setActionError("Não foi possível atualizar a candidatura. Tente novamente."); }
    finally { setBusyId(null); }
  }

  const statusOptions = ["pending", "reviewed", "rejected", "hired"];
  const statusLabels: Record<string, string> = { pending: "Pendente", reviewed: "Em análise", rejected: "Recusada", hired: "Contratado" };

  const backHref = profile?.tipoConta === "empresa" ? "/perfils/empresa" : profile?.tipoConta === "estudante" ? "/perfils/estudante" : "/feed";

  if (loading) return <main className="mx-auto w-full max-w-5xl p-8"><p role="status">Carregando notificações...</p></main>;
  if (!user) return <main className="mx-auto w-full max-w-xl p-8 text-center"><h1 className="text-2xl font-black">Suas notificações</h1><p className="my-5 text-slate-600">Entre para acompanhar propostas e candidaturas.</p><Link href="/login" className="inline-flex rounded-full bg-[#123a5a] px-5 py-3 text-sm font-semibold text-white">Entrar na minha conta</Link></main>;

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

        <AccountWarnings />
        {actionError && <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-red-700">{actionError}</p>}
        {profile?.tipoConta === "estudante" && <section className="mb-6 rounded-3xl border border-[#dfeeff] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Minhas candidaturas</h2><Link href="/vagas" className="text-sm font-semibold underline">Explorar vagas</Link></div>
          {applications.length === 0 ? <p className="text-sm text-slate-500">Você ainda não se candidatou a uma vaga.</p> : <div className="space-y-3">{applications.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eaf4ff] bg-[#f9fcff] p-4"><div><h3 className="font-bold">{item.role || "Oportunidade"}</h3><p className="mt-1 text-sm text-slate-500">{String(item.toCompanyName || "Empresa")}</p></div><span className="rounded-full bg-[#edf6ff] px-3 py-1.5 text-xs font-semibold">{statusLabels[item.status || "pending"] || "Pendente"}</span></article>)}</div>}
        </section>}
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
                          <div className="text-sm text-slate-600">Status: {statusLabels[it.status || "pending"] || it.status}</div>
                          <p className="mt-2 text-sm text-slate-700">{it.message}</p>
                        </div>
                        <div className="flex min-w-[150px] flex-col gap-2">
                          <button onClick={() => handleOpenResume(it.fromUserId)} className="rounded-full bg-[#123a5a] px-2 py-1.5 text-sm font-medium text-white">Ver currículo</button>
                          <button disabled={busyId === it.id || it.read} onClick={() => handleMarkApplicationRead(it.id)} className="rounded-full bg-slate-100 px-2 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50">{it.read ? "Lida" : "Marcar lida"}</button>
                          <select
                            value={it.status || "pending"}
                            disabled={busyId === it.id}
                            aria-label={"Situação da candidatura de " + (it.fromUserName || "candidato")}
                            onChange={(e) => handleApplicationStatus(it.id, e.target.value)}
                            className="rounded-full border border-[#cfe8ff] bg-white px-2 py-1.5 text-sm text-slate-700"
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>{statusLabels[status]}</option>
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
