"use client";
import React from "react";
import ProposalForm from "@/components/proposals/ProposalForm";

type StudentCardProfile = {
  uid: string;
  nome?: string;
  instituicao?: string;
  resumeUrl?: string;
};

type Props = {
  student: StudentCardProfile;
  canPropose?: boolean;
  challengeCount?: number;
};

export default function StudentCard({ student, canPropose = false, challengeCount = 0 }: Props) {
  return (
    <div className="rounded-lg border border-[#edf3ff] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-[#123a5a]">{student.nome}</p>
          <p className="text-xs text-slate-500">{student.instituicao || ''}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-[#edf6ff] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#123a5a]">
            {challengeCount} desafios
          </span>
          {student.resumeUrl && (
            <a href={student.resumeUrl} target="_blank" rel="noreferrer" className="text-xs text-[#123a5a] underline">Ver currículo</a>
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
