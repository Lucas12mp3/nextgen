"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import {
  calcularPontosDesafio,
  criarDesafio,
  enviarTentativa,
  PONTOS_POR_NIVEL,
  subscribeConquistas,
  subscribeDesafiosAbertos,
  subscribeDesafiosEmpresa,
  type Conquista,
  type Desafio,
  type DesafioNivel,
  type PerguntaComGabarito,
} from "@/services/desafios";

type PerfilTipo = "empresa" | "estudante" | null;

type FormPergunta = {
  enunciado: string;
  opcoes: string[];
  correta: number;
};

const criaPergunta = (): FormPergunta => ({
  enunciado: "",
  opcoes: ["", "", "", ""],
  correta: 0,
});

export default function DesafiosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tipoConta, setTipoConta] = useState<PerfilTipo>(null);
  const [loading, setLoading] = useState(true);
  const [empresaNome, setEmpresaNome] = useState("");
  const [desafios, setDesafios] = useState<Desafio[]>([]);
  const [conquistas, setConquistas] = useState<Conquista[]>([]);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [area, setArea] = useState("");
  const [nivel, setNivel] = useState<DesafioNivel>("iniciante");
  const [notaMinima, setNotaMinima] = useState(70);
  const [perguntas, setPerguntas] = useState<FormPergunta[]>([criaPergunta(), criaPergunta()]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedDesafio, setSelectedDesafio] = useState<Desafio | null>(null);
  const [respostas, setRespostas] = useState<number[]>([]);
  const [resultado, setResultado] = useState<{ nota: number; aprovado: boolean } | null>(null);
  const [quizError, setQuizError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setTipoConta(null);
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
        const perfil = typeof data?.tipoConta === "string" ? (data.tipoConta as PerfilTipo) : null;
        setTipoConta(perfil);
        setEmpresaNome(typeof data?.nome === "string" ? data.nome : "Empresa");
      } catch {
        setTipoConta(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    if (tipoConta === "empresa") {
      const unsub = subscribeDesafiosEmpresa(user.uid, (items) => setDesafios(items));
      return () => unsub();
    }

    if (tipoConta === "estudante") {
      const unsubDesafios = subscribeDesafiosAbertos((items) => setDesafios(items));
      const unsubConquistas = subscribeConquistas(user.uid, (items) => setConquistas(items));
      return () => {
        unsubDesafios();
        unsubConquistas();
      };
    }

    return undefined;
  }, [user, tipoConta]);

  function handleAddPergunta() {
    if (perguntas.length >= 5) return;
    setPerguntas((prev) => [...prev, criaPergunta()]);
  }

  function handlePerguntaChange(index: number, value: string) {
    setPerguntas((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, enunciado: value } : item))
    );
  }

  function handleOpcaoChange(perguntaIndex: number, opcaoIndex: number, value: string) {
    setPerguntas((prev) =>
      prev.map((pergunta, index) => {
        if (index !== perguntaIndex) return pergunta;

        const opcoes = [...pergunta.opcoes];
        opcoes[opcaoIndex] = value;

        return { ...pergunta, opcoes };
      })
    );
  }

  function handleRespostaChange(perguntaIndex: number, opcaoIndex: number) {
    setRespostas((prev) => {
      const next = [...prev];
      next[perguntaIndex] = opcaoIndex;
      return next;
    });
  }

  async function handleCriarDesafio(event: React.FormEvent) {
    event.preventDefault();

    if (!user || tipoConta !== "empresa") {
      setFeedback({ type: "error", message: "Você precisa estar logado como empresa." });
      return;
    }

    const perguntasValidadas = perguntas
      .map((pergunta) => {
        const opcoesValidas = pergunta.opcoes.map((op) => op.trim()).filter(Boolean);
        if (!pergunta.enunciado.trim() || opcoesValidas.length < 2 || opcoesValidas.length > 5) {
          return null;
        }

        const corretaIndex = pergunta.opcoes.findIndex((op) => op.trim() === pergunta.opcoes[pergunta.correta]?.trim());
        const finalCorreta = corretaIndex >= 0 ? corretaIndex : 0;

        return {
          enunciado: pergunta.enunciado.trim(),
          opcoes: opcoesValidas,
          correta: finalCorreta,
        } satisfies PerguntaComGabarito;
      })
      .filter(Boolean) as PerguntaComGabarito[];

    if (!titulo.trim() || !descricao.trim() || !area.trim() || perguntasValidadas.length === 0) {
      setFeedback({ type: "error", message: "Preencha todos os campos e inclua pelo menos uma pergunta válida." });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      await criarDesafio({
        empresaId: user.uid,
        empresaNome,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        area: area.trim(),
        nivel,
        notaMinima,
        perguntas: perguntasValidadas,
      });

      setTitulo("");
      setDescricao("");
      setArea("");
      setNivel("iniciante");
      setNotaMinima(70);
      setPerguntas([criaPergunta(), criaPergunta()]);
      setFeedback({ type: "success", message: "Desafio criado com sucesso." });
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Não foi possível criar o desafio." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResponderDesafio() {
    if (!selectedDesafio || !user || tipoConta !== "estudante") return;
    const respostasPendentes = selectedDesafio.perguntas.some((_, index) => respostas[index] === undefined || respostas[index] < 0);
    if (respostasPendentes) { setQuizError("Responda todas as perguntas antes de enviar."); return; }
    try {
      const result = await enviarTentativa(selectedDesafio.id, selectedDesafio.perguntas.map((_, index) => respostas[index]));
      setResultado({ nota: result.nota, aprovado: result.aprovado });
      setQuizError("");
      setFeedback(result.aprovado ? { type: "success", message: `Parabéns! Nota ${result.nota}% e conquista registrada.` } : { type: "error", message: `Nota ${result.nota}%; não atingiu a nota mínima de ${selectedDesafio.notaMinima}%.` });
    } catch (err) { setQuizError(err instanceof Error ? err.message : "Não foi possível enviar as respostas."); }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando desafios...</div>;
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-6 text-slate-800">
        <div className="mx-auto max-w-xl rounded-[24px] border border-[#dfeeff] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-[#123a5a]">Acesso obrigatório</h1>
          <p className="mt-3 text-sm text-slate-600">Faça login para acessar os desafios da NextGen.</p>
          <Link href="/login" className="mt-5 inline-flex rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white">
            Ir para login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 rounded-[26px] border border-[#dfeeff] bg-white p-5 shadow-[0_16px_40px_rgba(18,58,90,0.08)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b8eb8]">NextGen</p>
            <h1 className="mt-2 text-3xl font-black text-[#123a5a]">Desafios</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/feed" className="rounded-full border border-[#cfe8ff] bg-[#f7fbff] px-4 py-2 text-sm font-semibold text-[#123a5a]">Voltar para o feed</Link>
            {tipoConta === "empresa" ? (
              <Link href="/perfils/empresa" className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white">Meu perfil</Link>
            ) : (
              <Link href="/perfils/estudante" className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white">Meu perfil</Link>
            )}
          </div>
        </div>

        {tipoConta === "empresa" ? (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[24px] border border-[#dfeeff] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-[#123a5a]">Criar desafio</h2>
              <form onSubmit={handleCriarDesafio} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="md:col-span-2 block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Título</span>
                    <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none focus:border-[#9ad4ff]" placeholder="Ex.: Desafio de lógica de negócios" />
                  </label>

                  <label className="md:col-span-2 block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Descrição</span>
                    <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none focus:border-[#9ad4ff]" placeholder="Descreva o objetivo e a proposta do desafio." />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Área</span>
                    <input value={area} onChange={(e) => setArea(e.target.value)} className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none focus:border-[#9ad4ff]" placeholder="Ex.: Marketing" />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Nível</span>
                    <select value={nivel} onChange={(e) => setNivel(e.target.value as DesafioNivel)} className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none focus:border-[#9ad4ff]">
                      <option value="iniciante">Iniciante</option>
                      <option value="intermediario">Intermediário</option>
                      <option value="avancado">Avançado</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Nota mínima (%)</span>
                    <input type="number" min={0} max={100} value={notaMinima} onChange={(e) => setNotaMinima(Number(e.target.value) || 0)} className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none focus:border-[#9ad4ff]" />
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Perguntas</h3>
                    <button type="button" onClick={handleAddPergunta} disabled={perguntas.length >= 5} className="rounded-full border border-[#cfe8ff] px-3 py-1.5 text-xs font-semibold text-[#123a5a] disabled:cursor-not-allowed disabled:opacity-50">
                      + Adicionar pergunta
                    </button>
                  </div>

                  {perguntas.map((pergunta, index) => (
                    <div key={index} className="rounded-[18px] border border-[#eaf4ff] bg-[#f9fcff] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-[#123a5a]">Pergunta {index + 1}</span>
                        <button type="button" onClick={() => setPerguntas((prev) => prev.filter((_, i) => i !== index))} className="text-xs font-semibold text-red-600">Remover</button>
                      </div>

                      <textarea value={pergunta.enunciado} onChange={(e) => handlePerguntaChange(index, e.target.value)} rows={2} className="w-full rounded-2xl border border-[#cfe8ff] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#9ad4ff]" placeholder="Ex.: Qual é a melhor estratégia para ... ?" />

                      <div className="mt-3 space-y-2">
                        {pergunta.opcoes.map((opcao, opcaoIndex) => (
                          <div key={opcaoIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              checked={pergunta.correta === opcaoIndex}
                              onChange={() =>
                                setPerguntas((prev) =>
                                  prev.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, correta: opcaoIndex } : item
                                  )
                                )
                              }
                              className="h-4 w-4"
                            />
                            <input
                              value={opcao}
                              onChange={(e) => handleOpcaoChange(index, opcaoIndex, e.target.value)}
                              className="w-full rounded-xl border border-[#cfe8ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#9ad4ff]"
                              placeholder={`Opção ${opcaoIndex + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {feedback && (
                  <p className={`text-sm ${feedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                    {feedback.message}
                  </p>
                )}

                <div className="flex justify-end">
                  <button type="submit" disabled={submitting} className="rounded-full bg-[#123a5a] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                    {submitting ? "Publicando..." : "Publicar desafio"}
                  </button>
                </div>
              </form>
            </section>

            <aside className="rounded-[24px] border border-[#dfeeff] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-[#123a5a]">Desafios publicados</h2>
              <div className="mt-4 space-y-3">
                {desafios.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#cfe8ff] bg-[#f7fbff] p-5 text-sm text-slate-600">Ainda não há desafios criados.</div>
                ) : (
                  desafios.map((desafio) => (
                    <div key={desafio.id} className="rounded-[18px] border border-[#eaf4ff] bg-[#f9fcff] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-black text-[#123a5a]">{desafio.titulo}</h3>
                          <p className="mt-1 text-xs text-slate-500">{desafio.area} • {desafio.nivel}</p>
                        </div>
                        <span className="rounded-full bg-[#eaf6ff] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#123a5a]">{desafio.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{desafio.descricao}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#123a5a]">
                        <span>Nota mínima: {desafio.notaMinima}%</span>
                        <span className="rounded-full bg-[#eaf6ff] px-2 py-1">{desafio.pontos ?? PONTOS_POR_NIVEL[desafio.nivel]} pts</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>
        ) : tipoConta === "estudante" ? (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[24px] border border-[#dfeeff] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-[#123a5a]">Desafios abertos</h2>
                <span className="rounded-full bg-[#edf6ff] px-2.5 py-1 text-xs font-bold text-[#123a5a]">{desafios.length}</span>
              </div>

              {desafios.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#cfe8ff] bg-[#f7fbff] p-6 text-sm text-slate-600">Nenhum desafio disponível no momento.</div>
              ) : (
                <div className="space-y-3">
                  {desafios.map((desafio) => {
                    const jaFeito = conquistas.some((item) => item.desafioId === desafio.id);

                    return (
                      <div key={desafio.id} className="rounded-[18px] border border-[#eaf4ff] bg-[#f9fcff] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-black text-[#123a5a]">{desafio.titulo}</h3>
                            <p className="mt-1 text-xs text-slate-500">{desafio.empresaNome} • {desafio.area} • {desafio.nivel}</p>
                          </div>
                          <span className="rounded-full bg-[#eaf6ff] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#123a5a]">{desafio.notaMinima}%</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">{desafio.descricao}</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="rounded-full bg-[#eaf6ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#123a5a]">
                            {desafio.pontos ?? calcularPontosDesafio(desafio.nivel)} pts
                          </span>
                          <div className="flex justify-end">
                            {jaFeito ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Concluído</span>
                            ) : (
                              <Link href={`/desafios/${desafio.id}`} className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white">
                                Responder
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <div className="rounded-[24px] border border-[#dfeeff] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-[#123a5a]">Minhas conquistas</h2>
                <div className="mt-4 space-y-3">
                  {conquistas.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#cfe8ff] bg-[#f7fbff] p-5 text-sm text-slate-600">Você ainda não ganhou nenhuma conquista.</div>
                  ) : (
                    conquistas.map((item) => (
                      <div key={item.id} className="rounded-[18px] border border-[#eaf4ff] bg-[#f9fcff] p-3">
                        <p className="text-sm font-black text-[#123a5a]">{item.desafioTitulo}</p>
                        <p className="text-xs text-slate-500">{item.empresaNome} • {item.nivel}</p>
                        <p className="mt-2 text-xs font-semibold text-emerald-700">Nota: {item.nota}%</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-[24px] border border-[#dfeeff] bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-black text-[#123a5a]">Perfil ainda não definido</h2>
            <p className="mt-2 text-sm text-slate-600">Complete o cadastro para acessar os desafios.</p>
          </div>
        )}
      </div>

      {selectedDesafio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[26px] border border-[#dfeeff] bg-white p-5 shadow-[0_25px_80px_rgba(0,0,0,0.2)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b8eb8]">Quiz</p>
                <h2 className="mt-1 text-2xl font-black text-[#123a5a]">{selectedDesafio.titulo}</h2>
              </div>
              <button type="button" onClick={() => { setSelectedDesafio(null); setResultado(null); setQuizError(""); }} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">Fechar</button>
            </div>

            <p className="mt-3 text-sm text-slate-600">{selectedDesafio.descricao}</p>

            <div className="mt-5 space-y-5">
              {selectedDesafio.perguntas.map((pergunta, index) => (
                <div key={index} className="rounded-[18px] border border-[#eaf4ff] bg-[#f9fcff] p-4">
                  <p className="text-base font-bold text-[#123a5a]">{index + 1}. {pergunta.enunciado}</p>
                  <div className="mt-3 space-y-2">
                    {pergunta.opcoes.map((opcao, opcaoIndex) => (
                      <label key={opcaoIndex} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#dfeeff] bg-white px-3 py-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          checked={respostas[index] === opcaoIndex}
                          onChange={() => handleRespostaChange(index, opcaoIndex)}
                          className="h-4 w-4"
                        />
                        <span>{opcao}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {quizError && <p className="mt-4 text-sm text-red-600">{quizError}</p>}

            {resultado && (
              <div className={`mt-5 rounded-2xl border p-4 ${resultado.aprovado ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                <p className="text-sm font-bold text-[#123a5a]">Resultado: {resultado.nota}%</p>
                <p className="mt-1 text-sm text-slate-700">
                  {resultado.aprovado ? "Você foi aprovado e recebeu a conquista." : "Você não atingiu a nota mínima desta vez."}
                </p>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={handleResponderDesafio} className="rounded-full bg-[#123a5a] px-5 py-2.5 text-sm font-semibold text-white">Enviar respostas</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
