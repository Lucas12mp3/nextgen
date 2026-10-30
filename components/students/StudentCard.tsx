"use client";
import { useId, useState } from "react";
import ProposalForm from "@/components/proposals/ProposalForm";

type StudentCardProfile = {
  uid: string;
  nome?: string;
  instituicao?: string;};

type Props = {
  student: StudentCardProfile;
  canPropose?: boolean;
  challengeCount?: number;
  totalPoints?: number;
  rankingPosition?: number;
};

function getRankBadge(position?: number) {
  if (!position || position > 10) return null;
  if (position === 1) return "Top 1";
  if (position <= 3) return `Top ${position}`;
  return `Top ${position}`;
}

export default function StudentCard({ student, canPropose = false, challengeCount = 0, totalPoints = 0, rankingPosition }: Props) {
  const badge = getRankBadge(rankingPosition);
  const [contactOpen, setContactOpen] = useState(false);
  const contactId = useId();

  return (
    <article className="student-card rounded-2xl border border-[#dfeeff] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf6ff] text-lg font-black text-[#123a5a]">{(student.nome || "E").slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="break-words font-bold text-[#123a5a]">{student.nome || "Estudante"}</p>
            {badge && (
              <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-sm">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{student.instituicao || ''}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-[#edf6ff] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#123a5a]">
            {challengeCount} {challengeCount === 1 ? "desafio" : "desafios"}
          </span>
          {totalPoints > 0 && (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              {totalPoints} pts
            </span>
          )}
        </div>
      </div>
      {canPropose && <div className="mt-5 border-t border-[#edf3ff] pt-4">
        <button type="button" aria-expanded={contactOpen} aria-controls={contactId} onClick={() => setContactOpen(!contactOpen)} className="w-full rounded-full bg-[#123a5a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#20557e]">{contactOpen ? "Fechar proposta" : "Conversar sobre uma oportunidade"}</button>
        {contactOpen && <div id={contactId} className="mt-4 animate-enter"><ProposalForm toUserId={student.uid} /></div>}
      </div>}
    </article>
  );
}
