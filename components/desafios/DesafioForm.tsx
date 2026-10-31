"use client";
import { useRef, useState } from "react";
import { criarDesafio, type DesafioNivel, type PerguntaComGabarito } from "@/services/desafios";
const question = (): PerguntaComGabarito => ({ enunciado: "", opcoes: ["", "", "", ""], correta: 0 });
const field = "mt-2 w-full rounded-xl border border-[#cfe8ff] bg-[#f9fcff] px-3 py-2.5 text-sm font-normal";
export default function DesafioForm({ companyId, enabled }: { companyId: string; enabled: boolean }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [area, setArea] = useState("");
  const [nivel, setNivel] = useState<DesafioNivel>("iniciante");
  const [notaMinima, setNotaMinima] = useState(70);
  const [perguntas, setPerguntas] = useState([question()]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  function update(index: number, patch: Partial<PerguntaComGabarito>) { setPerguntas(previous => previous.map((item, i) => i === index ? { ...item, ...patch } : item)); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !enabled) return;
    lock.current = true; setBusy(true); setFeedback(null);
    try {
      await criarDesafio({ empresaId: companyId, titulo, descricao, area, nivel, notaMinima, perguntas });
      setTitulo(""); setDescricao(""); setArea(""); setNivel("iniciante"); setNotaMinima(70); setPerguntas([question()]);
      setFeedback({ error: false, text: "Desafio publicado. Os estudantes já podem participar." });
    } catch (error) { setFeedback({ error: true, text: error instanceof Error ? error.message : "Não foi possível publicar o desafio." }); }
    finally { lock.current = false; setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-5 space-y-5">
    <p className="text-sm leading-6 text-slate-500">Crie de 1 a 5 perguntas. Cada estudante terá uma tentativa válida e a nota será calculada automaticamente.</p>
    {feedback && <p role={feedback.error ? "alert" : "status"} className={`rounded-xl p-4 text-sm ${feedback.error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{feedback.text}</p>}
    <fieldset disabled={busy || !enabled} className="space-y-4 disabled:opacity-60"><legend className="sr-only">Dados do desafio</legend>
      <label className="block text-sm font-semibold">Título<input required maxLength={160} value={titulo} onChange={event => setTitulo(event.target.value)} className={field} /></label>
      <label className="block text-sm font-semibold">Descrição<textarea required maxLength={3000} rows={3} value={descricao} onChange={event => setDescricao(event.target.value)} className={field} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Área<input required maxLength={120} value={area} onChange={event => setArea(event.target.value)} className={field} /></label><label className="block text-sm font-semibold">Nível<select value={nivel} onChange={event => setNivel(event.target.value as DesafioNivel)} className={field}><option value="iniciante">Iniciante · até 100 pontos</option><option value="intermediario">Intermediário · até 200 pontos</option><option value="avancado">Avançado · até 350 pontos</option></select></label></div>
      <label className="block text-sm font-semibold">Nota mínima (%)<input required type="number" min={1} max={100} step={1} value={notaMinima} onChange={event => setNotaMinima(Number(event.target.value))} className={field} /></label>
      {perguntas.map((item, index) => <fieldset key={index} className="space-y-3 rounded-2xl border border-[#dfeeff] bg-[#f9fcff] p-4"><legend className="px-2 text-sm font-bold">Pergunta {index + 1}</legend><label className="block text-sm font-semibold">Enunciado<textarea required maxLength={1000} value={item.enunciado} onChange={event => update(index, { enunciado: event.target.value })} rows={2} className={field} /></label><p className="text-xs leading-5 text-slate-500">Preencha ao menos duas alternativas e marque a correta. As alternativas vazias serão removidas.</p>{item.opcoes.map((option, optionIndex) => <div key={optionIndex} className="flex items-center gap-3"><input type="radio" name={`correct-${index}`} aria-label={`Alternativa ${optionIndex + 1} correta na pergunta ${index + 1}`} checked={item.correta === optionIndex} onChange={() => update(index, { correta: optionIndex })} className="h-4 w-4 shrink-0 accent-[#123a5a]" /><label className="min-w-0 flex-1"><span className="sr-only">Texto da alternativa {optionIndex + 1}</span><input maxLength={300} value={option} onChange={event => update(index, { opcoes: item.opcoes.map((value, i) => i === optionIndex ? event.target.value : value) })} placeholder={`Alternativa ${optionIndex + 1}`} className={field} /></label></div>)}<div className="flex flex-wrap justify-between gap-3">{item.opcoes.length < 5 && <button type="button" onClick={() => update(index, { opcoes: [...item.opcoes, ""] })} className="text-xs font-semibold text-[#2577bd]">+ Adicionar alternativa</button>}{perguntas.length > 1 && <button type="button" onClick={() => setPerguntas(previous => previous.filter((_, i) => i !== index))} className="text-xs font-semibold text-red-700">Remover pergunta</button>}</div></fieldset>)}
      {perguntas.length < 5 && <button type="button" onClick={() => setPerguntas(previous => [...previous, question()])} className="rounded-full border border-[#cfe8ff] px-4 py-2 text-sm font-semibold">+ Adicionar pergunta</button>}
      <div className="text-right"><button type="submit" className="rounded-full bg-[#123a5a] px-5 py-3 text-sm font-semibold text-white">{busy ? "Publicando..." : "Publicar desafio"}</button></div>
    </fieldset>
  </form>;
}
