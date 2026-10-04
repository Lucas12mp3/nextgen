"use client";
import Link from "next/link";
import React from "react";
import ProposalForm from "@/components/proposals/ProposalForm";

type Props = {
  student: any;
  canPropose?: boolean;
};

export default function StudentCard({ student, canPropose = false }: Props) {
  return (
    <div className="rounded-lg border border-[#edf3ff] bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-[#123a5a]">{student.nome}</p>
          <p className="text-xs text-slate-500">{student.instituicao || ''}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
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
