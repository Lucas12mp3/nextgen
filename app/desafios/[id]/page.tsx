"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { useChallengeAvailability } from "@/components/desafios/useChallengeAvailability";
import { enviarTentativa, getDesafio, getResultado, type AttemptResult, type Desafio } from "@/services/desafios";

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState(false);
  const [challenge, setChallenge] = useState<Desafio | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const available = useChallengeAvailability();
  useEffect(() => {
    let active = true, version = 0;
    const stop = onAuthStateChanged(auth, async current => {
      const request = ++version;
      setUser(current); setChallenge(null); setResult(null); setAnswers({}); setStudent(false); setError("");
      if (!current) { setLoading(false); return; }
      setLoading(true);
      try {
        const profile = await getDoc(doc(db, "users", current.uid));
        if (!active || version !== request) return;
        if (profile.get("tipoConta") !== "estudante") return;
        setStudent(true);
        const [item, previous] = await Promise.all([getDesafio(id), getResultado(id)]);
        if (!active || version !== request) return;
        if (!item) { setError("Este desafio não está disponível. Escolha outro desafio."); return; }
        setChallenge(item); setResult(previous);
      } catch { if (active && version === request) setError("Não foi possível carregar o desafio e seu resultado. Confira sua conexão e tente novamente."); }
      finally { if (active && version === request) setLoading(false); }
    });
    return () => { active = false; stop(); };
  }, [id]);
  const answered = challenge?.perguntas.filter((_, index) => Number.isInteger(answers[index])).length || 0;
  const canSubmit = !!challenge && challenge.status === "aberto" && !result && available === true;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!challenge || !canSubmit || lock.current) return;
    if (answered !== challenge.perguntas.length) { setError("Responda todas as perguntas antes de enviar."); return; }
    lock.current = true; setBusy(true); setError("");
    try { setResult(await enviarTentativa(challenge.id, challenge.perguntas.map((_, index) => answers[index]))); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível enviar as respostas. Tente novamente."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <main className="min-h-screen bg-[#edf6ff] p-4 text-slate-800 sm:p-8"><div className="mx-auto max-w-3xl rounded-3xl border border-[#dfeeff] bg-white p-5 shadow-sm sm:p-8">
    <Link href="/desafios" className="text-sm font-semibold text-[#2577bd]">← Voltar aos desafios</Link>
    {loading ? <p role="status" className="my-8">Carregando desafio e resultado...</p> : !user ? <div className="my-8"><h1 className="text-2xl font-black">Entre para participar</h1><Link href="/login" className="mt-4 inline-flex underline">Entrar na conta</Link></div> : !student ? <p className="my-8">Esta página é exclusiva para estudantes.</p> : <>
      {error && <p role="alert" className="my-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {challenge && <><h1 className="mt-5 text-3xl font-black text-[#123a5a]">{challenge.titulo}</h1><p className="mt-2 text-sm text-slate-500">{challenge.empresaNome} · {challenge.area} · {challenge.nivel}</p><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">{challenge.descricao}</p><div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-[#f6fbff] p-4 text-sm"><p>Nota mínima: <strong>{challenge.notaMinima}%</strong></p><p>Até <strong>{challenge.pontos} pontos</strong></p></div>
        {result ? <section role="status" className={`mt-6 rounded-2xl border p-5 ${result.aprovado ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><p className="text-xs font-bold uppercase tracking-widest">{result.duplicated ? "Resultado já registrado" : "Resultado da sua participação"}</p><h2 className="mt-3 text-2xl font-black">Nota: {result.nota}%</h2><p className="mt-3 text-sm">Você acertou {result.acertos} de {challenge.perguntas.length} perguntas.</p><p className="mt-2 text-sm">{result.aprovado ? `Conquista recebida! Você ganhou ${result.pontos} pontos.` : "Você não atingiu a nota mínima desta vez. Sua participação foi registrada e você pode explorar outros desafios."}</p><div className="mt-5 flex flex-wrap gap-4"><Link href="/ranking" className="text-sm font-semibold underline">Ver ranking</Link><Link href="/desafios" className="text-sm font-semibold underline">Explorar outros desafios</Link></div></section>
        : challenge.status !== "aberto" ? <p className="my-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Este desafio foi fechado pela empresa e não recebe novas respostas.</p>
        : available === false ? <p className="my-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">A correção está temporariamente indisponível. Tente novamente mais tarde.</p>
        : <form onSubmit={submit} className="mt-6 space-y-5"><p className="rounded-xl bg-[#edf6ff] p-4 text-sm leading-6">Você tem uma tentativa válida. Confira todas as respostas antes de enviar. Se a conexão falhar, repetir o envio recupera o resultado registrado.</p><div className="flex justify-between text-xs font-semibold"><span>Seu progresso</span><span>{answered}/{challenge.perguntas.length} respondidas</span></div><progress aria-label="Perguntas respondidas" value={answered} max={challenge.perguntas.length} className="h-2 w-full accent-[#123a5a]" />{challenge.perguntas.map((question, index) => <fieldset key={index} disabled={busy} className="space-y-2 rounded-2xl border border-[#dfeeff] bg-[#f9fcff] p-4"><legend className="px-2 text-sm font-bold">Pergunta {index + 1}</legend><p className="mb-3 whitespace-pre-wrap text-sm font-semibold">{question.enunciado}</p>{question.opcoes.map((option, optionIndex) => <label key={optionIndex} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dfeeff] bg-white p-3 text-sm leading-6"><input type="radio" required name={`question-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers(previous => ({ ...previous, [index]: optionIndex }))} className="mt-1 h-4 w-4 shrink-0 accent-[#123a5a]" /><span className="break-words">{option}</span></label>)}</fieldset>)}<div className="text-right"><button type="submit" disabled={busy || !canSubmit || answered !== challenge.perguntas.length} className="rounded-full bg-[#123a5a] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Corrigindo..." : "Enviar respostas definitivas"}</button></div></form>}
      </>}
    </>}
  </div></main>;
}
