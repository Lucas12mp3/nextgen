"use client";
import { useRef, useState } from "react";
import { saveEducation, saveProject, removePortfolioRecord } from "@/services/student-portfolio";
import type { Education, Project } from "@/lib/student-portfolio";
import { useStudentPortfolio } from "./useStudentPortfolio";
import { educationStatus } from "./StudentPortfolio";

const field = "mt-1 w-full rounded-xl border border-[#cfe8ff] bg-white px-3 py-2.5 text-sm font-normal";
const button = "rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold text-[#123a5a] disabled:opacity-50";
const emptyProject: Omit<Project, "id"> = { nome: "", descricao: "", tecnologias: "", link: "" };
const emptyEducation: Omit<Education, "id"> = { curso: "", instituicao: "", inicio: "", conclusao: "", situacao: "cursando" };
function freeSlot(items: { id: string }[]) { return Array.from({ length: 10 }, (_, i) => String(i)).find(id => !items.some(item => item.id === id)); }
export default function PortfolioEditor({ userId }: { userId: string }) {
  const { projects, education, loading, error } = useStudentPortfolio(userId);
  const [project, setProject] = useState(emptyProject), [formation, setFormation] = useState(emptyEducation);
  const [editing, setEditing] = useState<{ kind: "projetos" | "formacoes"; id: string } | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const lock = useRef(false);
  async function action(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage("");
    try { await task(); setEditing(null); setMessage("Alterações salvas."); }
    catch (e) { setMessage((e as { code?: string }).code === "permission-denied" ? "Não foi possível salvar. Confira sua conta e a publicação das regras do Firestore." : e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { lock.current = false; setBusy(false); }
  }
  function add(kind: "projetos" | "formacoes") {
    const id = freeSlot(kind === "projetos" ? projects : education);
    if (id === undefined) { setMessage("Você pode cadastrar até 10 registros por seção."); return; }
    setMessage(""); setProject(emptyProject); setFormation(emptyEducation); setEditing({ kind, id });
  }
  return <section className="mt-6 rounded-2xl border border-[#dfeeff] bg-white p-5 sm:p-6">
    <h2 className="text-xl font-black text-[#123a5a]">Sua trajetória</h2><p className="mt-2 text-sm leading-6 text-slate-500">Apresente projetos escolares, TCCs, formação e cursos complementares. Estes registros ficam visíveis à comunidade autenticada. Não informe documentos, endereço ou outros dados privados. Até 10 registros em cada seção.</p>
    {loading ? <p role="status" className="mt-5">Carregando...</p> : error ? <p role="alert" className="mt-5 text-sm text-red-700">{error}</p> : <>
      <div className="mt-5 grid gap-5 md:grid-cols-2">{([ ["projetos", "Projetos", projects], ["formacoes", "Formação e cursos", education] ] as const).map(([kind, label, items]) => <div key={kind} className="rounded-xl border border-[#dfeeff] p-4"><h3 className="font-bold">{label}</h3><ul className="my-4 space-y-3">{items.map(item => <li key={item.id} className="rounded-xl bg-[#f6fbff] p-3"><p className="break-words text-sm font-semibold">{"nome" in item ? item.nome : item.curso}</p><div className="mt-2 flex flex-wrap gap-3"><button type="button" disabled={busy} className="text-xs font-semibold underline" onClick={() => { setMessage(""); if ("nome" in item) setProject(item); else setFormation(item); setEditing({ kind, id: item.id }); }}>Editar<span className="sr-only"> {"nome" in item ? item.nome : item.curso}</span></button><button type="button" disabled={busy} className="text-xs font-semibold text-red-700 underline" onClick={() => { if (window.confirm("Remover este registro do perfil?")) void action(() => removePortfolioRecord(userId, kind, item.id)); }}>Remover<span className="sr-only"> {"nome" in item ? item.nome : item.curso}</span></button></div></li>)}</ul><button type="button" disabled={busy || items.length >= 10} className={button} onClick={() => add(kind)}>+ Adicionar {kind === "projetos" ? "projeto" : "formação ou curso"}</button></div>)}</div>
      {editing && <form className="mt-5 space-y-4 rounded-2xl bg-[#f6fbff] p-5" onSubmit={e => { e.preventDefault(); void action(async () => { if (editing.kind === "projetos") await saveProject(userId, editing.id, project); else await saveEducation(userId, editing.id, formation); }); }}>
        <fieldset disabled={busy} className="space-y-4"><legend className="mb-4 font-bold">{editing.kind === "projetos" ? "Detalhes do projeto" : "Detalhes da formação"}</legend>
          {editing.kind === "projetos" ? <><label className="block text-sm font-semibold">Nome do projeto<input autoFocus required maxLength={120} value={project.nome} onChange={e => setProject({ ...project, nome: e.target.value })} className={field} /></label><label className="block text-sm font-semibold">O que você desenvolveu e qual foi sua participação?<textarea required maxLength={2000} rows={4} value={project.descricao} onChange={e => setProject({ ...project, descricao: e.target.value })} className={field} /></label><label className="block text-sm font-semibold">Tecnologias e habilidades, separadas por vírgula<input maxLength={300} value={project.tecnologias} onChange={e => setProject({ ...project, tecnologias: e.target.value })} placeholder="React, TypeScript, trabalho em equipe" className={field} /></label><label className="block text-sm font-semibold">Link do projeto ou repositório (opcional)<input type="url" maxLength={500} value={project.link} onChange={e => setProject({ ...project, link: e.target.value })} placeholder="https://github.com/..." className={field} /></label></>
            : <><label className="block text-sm font-semibold">Curso<input autoFocus required maxLength={120} value={formation.curso} onChange={e => setFormation({ ...formation, curso: e.target.value })} placeholder="Técnico em Desenvolvimento de Sistemas" className={field} /></label><label className="block text-sm font-semibold">Instituição<input required maxLength={120} value={formation.instituicao} onChange={e => setFormation({ ...formation, instituicao: e.target.value })} className={field} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Início<input type="month" required value={formation.inicio} onChange={e => setFormation({ ...formation, inicio: e.target.value })} className={field} /></label><label className="block text-sm font-semibold">Conclusão ou previsão<input type="month" required={formation.situacao === "concluido"} min={formation.inicio} value={formation.conclusao} onChange={e => setFormation({ ...formation, conclusao: e.target.value })} className={field} /></label></div><label className="block text-sm font-semibold">Situação<select value={formation.situacao} onChange={e => setFormation({ ...formation, situacao: e.target.value as Education["situacao"] })} className={field}>{Object.entries(educationStatus).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></>}
          <div className="flex gap-3"><button type="submit" className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Salvando..." : "Salvar registro"}</button><button type="button" className={button} onClick={() => setEditing(null)}>Cancelar</button></div>
        </fieldset>
      </form>}
    </>}
    {message && <p role="status" className="mt-4 text-sm text-[#123a5a]">{message}</p>}
  </section>;
}
