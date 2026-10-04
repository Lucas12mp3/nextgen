"use client";
import React from "react";

type Props = {
  title: string;
  description?: string;
  requirements?: string;
  onClose: () => void;
};

export default function JobModal({ title, description, requirements, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[90%] max-w-2xl rounded bg-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-slate-600 mt-2">{description}</p>
          </div>
          <button onClick={onClose} className="text-sm text-slate-500">Fechar</button>
        </div>

        {requirements && (
          <div className="mt-4">
            <h3 className="font-semibold">Requisitos</h3>
            <p className="text-sm text-slate-700 mt-2 whitespace-pre-line">{requirements}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded bg-[#123a5a] px-4 py-2 text-white">Fechar</button>
        </div>
      </div>
    </div>
  );
}
