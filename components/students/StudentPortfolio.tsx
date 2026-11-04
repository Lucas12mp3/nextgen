"use client";
import { safeExternalUrl, type Education, type Project } from "@/lib/student-portfolio";
import { useStudentPortfolio } from "./useStudentPortfolio";
export const educationStatus = { cursando: "Em andamento", concluido: "Concluído", trancado: "Interrompido" };
export function PortfolioContent({ projects, education }: { projects: Project[]; education: Education[] }) {
  return <div className="grid gap-5 lg:grid-cols-2">
    <section className="rounded-2xl border border-[#dfeeff] bg-white p-5"><h2 className="text-xl font-black text-[#123a5a]">Formação e cursos</h2>
      {!education.length ? <p className="mt-4 text-sm text-slate-500">Nenhuma formação adicionada.</p> : <ul className="mt-4 space-y-4">{education.map(item => <li key={item.id} className="rounded-xl bg-[#f6fbff] p-4"><h3 className="break-words font-bold">{item.curso}</h3><p className="mt-1 break-words text-sm text-slate-600">{item.instituicao}</p><p className="mt-2 text-xs text-slate-500">{item.inicio} → {item.conclusao || "Sem previsão informada"} · {educationStatus[item.situacao]}</p></li>)}</ul>}
    </section>
    <section className="rounded-2xl border border-[#dfeeff] bg-white p-5"><h2 className="text-xl font-black text-[#123a5a]">Projetos</h2>
      {!projects.length ? <p className="mt-4 text-sm text-slate-500">Nenhum projeto adicionado.</p> : <ul className="mt-4 space-y-4">{projects.map(item => <li key={item.id} className="rounded-xl bg-[#f6fbff] p-4"><h3 className="break-words font-bold">{item.nome}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">{item.descricao}</p>{item.tecnologias && <p className="mt-2 break-words text-xs font-semibold text-[#123a5a]">Tecnologias e habilidades: {item.tecnologias}</p>}{safeExternalUrl(item.link) && <a href={safeExternalUrl(item.link)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#2577bd] underline">Ver projeto <span className="sr-only">{item.nome} em uma nova aba</span>↗</a>}</li>)}</ul>}
    </section>
  </div>;
}
export default function StudentPortfolio({ userId }: { userId: string }) {
  const { loading, error, ...data } = useStudentPortfolio(userId);
  if (loading) return <p role="status" className="p-5 text-sm">Carregando projetos e formação...</p>;
  if (error) return <p role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-800">{error}</p>;
  return <PortfolioContent {...data} />;
}
