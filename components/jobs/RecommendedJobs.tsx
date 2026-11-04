"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { recommendJobs } from "@/lib/job-recommendations";
import type { Vaga } from "@/services/vagas";
import { useStudentPortfolio } from "@/components/students/useStudentPortfolio";
const JobModal = dynamic(() => import("./JobModal"), { ssr: false });
export default function RecommendedJobs({ userId, skills, jobs }: { userId: string; skills: string[]; jobs: Vaga[] }) {
  const { projects, education, loading, error } = useStudentPortfolio(userId);
  const [selected, setSelected] = useState<Vaga | null>(null);
  const matches = recommendJobs(jobs, skills, education, projects).slice(0, 3);
  return <section aria-label="Vagas sugeridas para você" className="mb-5 rounded-2xl border border-[#b9e1ff] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black text-[#123a5a]">Sugestões para você</h2><Link href="/perfils/estudante/editar" className="text-xs font-semibold text-[#2577bd] underline">Atualizar meu perfil</Link></div>
    <p className="mt-2 text-xs leading-5 text-slate-500">Comparamos suas habilidades, projetos e formação com a área e o texto das vagas. As sugestões ajudam a explorar oportunidades e não garantem o atendimento a todos os requisitos. Todas as vagas continuam disponíveis.</p>
    {loading ? <p role="status" className="mt-4 text-sm">Preparando sugestões...</p> : error ? <p role="status" className="mt-4 text-sm text-amber-800">As sugestões estão indisponíveis. Você pode continuar consultando todas as vagas.</p> : !matches.length ? <p className="mt-4 rounded-xl bg-[#f6fbff] p-4 text-sm text-slate-600">{skills.length || education.length || projects.length ? "Não encontramos correspondências nas vagas disponíveis nesta lista. Explore as outras oportunidades." : "Adicione habilidades, projetos ou formação ao perfil para receber sugestões."}</p> : <ul className="mt-4 space-y-3">{matches.map(({ job, reasons }) => <li key={job.id} className="rounded-xl border border-[#dfeeff] bg-[#f8fcff] p-4"><h3 className="break-words font-bold text-[#123a5a]">{job.titulo}</h3><p className="mt-1 text-xs text-slate-500">{job.empresaNome} · {job.modalidade}</p><ul className="my-3 space-y-1">{reasons.map(reason => <li key={reason} className="break-words text-xs leading-5 text-emerald-800">{reason}</li>)}</ul><button type="button" onClick={() => setSelected(job)} className="rounded-full bg-[#123a5a] px-4 py-2 text-xs font-semibold text-white">Ver oportunidade</button></li>)}</ul>}
    {selected && <JobModal key={selected.id} vaga={selected} currentUserId={userId} isStudent onClose={() => setSelected(null)} />}
  </section>;
}
