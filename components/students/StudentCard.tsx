"use client";
import React from "react";
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

  return (
    <div className="rounded-lg border border-[#edf3ff] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-[#123a5a]">{student.nome}</p>
            {badge && (
              <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-sm">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{student.instituicao || ''}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-[#edf6ff] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#123a5a]">
            {challengeCount} desafios
          </span>
          {totalPoints > 0 && (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              {totalPoints} pts
            </span>
          )}
          {canPropose && (
            <div>
              <ProposalForm toUserId={student.uid} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
