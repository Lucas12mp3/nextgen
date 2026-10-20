"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { criarDesafio, type DesafioNivel } from "@/services/desafios";

type PerguntaForm = {
  enunciado: string;
  opcoes: string[];
  correta: number;
};

const criaPergunta = (): PerguntaForm => ({
  enunciado: "",
  opcoes: ["", "", "", ""],
  correta: 0,
});

type DesafioFormProps = {
  onCreated?: () => void;
};

export default function DesafioForm({ onCreated }: DesafioFormProps) {
  const [user, setUser] = useState<User | null>(null);
  const [empresaNome, setEmpresaNome] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [area, setArea] = useState("");
  const [nivel, setNivel] = useState<DesafioNivel>("iniciante");
  const [notaMinima, setNotaMinima] = useState(70);
  const [perguntas, setPerguntas] = useState<PerguntaForm[]>([criaPergunta()]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setEmpresaNome("");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
        setEmpresaNome(typeof data?.nome === "string" ? data.nome : u.displayName || "Empresa");
      } catch {
        setEmpresaNome(u.displayName || "Empresa");
      }
    });

    return () => unsub();
  }, []);

  function adicionarPergunta() {
    if (perguntas.length >= 5) return;
    setPerguntas((prev) => [...prev, criaPergunta()]);
  }

  function removerPergunta(index: number) {
    if (perguntas.length === 1) return;
    setPerguntas((prev) => prev.filter((_, i) => i !== index));
  }

  function adicionarOpcao(perguntaIndex: number) {
    setPerguntas((prev) =>
      prev.map((pergunta, index) => {
        if (index !== perguntaIndex) return pergunta;
        if (pergunta.opcoes.length >= 5) return pergunta;
        return { ...pergunta, opcoes: [...pergunta.opcoes, ""] };
      })
    );
  }

  function removerOpcao(perguntaIndex: number, opcaoIndex: number) {
    setPerguntas((prev) =>
      prev.map((pergunta, index) => {
        if (index !== perguntaIndex) return pergunta;
        if (pergunta.opcoes.length <= 2) return pergunta;

        const opcoes = pergunta.opcoes.filter((_, i) => i !== opcaoIndex);
        let correta = pergunta.correta;

        if (pergunta.correta > opcaoIndex && pergunta.correta > 0) {
          correta = pergunta.correta - 1;
        }

        if (pergunta.correta === opcaoIndex) {
          correta = 0;
        }

        return { ...pergunta, opcoes, correta };
      })
    );
  }

  function atualizarPergunta(index: number, campo: keyof PerguntaForm, valor: string | number) {
    setPerguntas((prev) =>
      prev.map((pergunta, perguntaIndex) => {
        if (perguntaIndex !== index) return pergunta;
        return { ...pergunta, [campo]: valor };
      })
    );
  }

  function atualizarOpcao(perguntaIndex: number, opcaoIndex: number, valor: string) {
    setPerguntas((prev) =>
      prev.map((pergunta, index) => {
        if (index !== perguntaIndex) return pergunta;
        const opcoes = [...pergunta.opcoes];
        opcoes[opcaoIndex] = valor;
        return { ...pergunta, opcoes };
      })
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!user) {
      setFeedback({ type: "error", message: "Você precisa estar autenticado para criar um desafio." });
      return;
    }

    if (!titulo.trim() || !descricao.trim() || !area.trim()) {
      setFeedback({ type: "error", message: "Preencha título, descrição e área do desafio." });
      return;
    }

    if (perguntas.length < 1) {
      setFeedback({ type: "error", message: "Adicione pelo menos uma pergunta." });
      return;
    }

    const perguntasValidas = perguntas.map((pergunta, index) => {
      const opcoes = pergunta.opcoes.map((opcao) => opcao.trim());
      const opcoesPreenchidas = opcoes.filter(Boolean);

      if (!pergunta.enunciado.trim()) {
        throw new Error(`Preencha o enunciado da pergunta ${index + 1}.`);
      }

      if (opcoesPreenchidas.length < 2 || opcoesPreenchidas.length > 5) {
        throw new Error(`A pergunta ${index + 1} precisa ter entre 2 e 5 opções preenchidas.`);
      }

      if (opcoes.some((opcao) => !opcao.trim())) {
        throw new Error(`Preencha todas as opções da pergunta ${index + 1}.`);
      }

      const correta = pergunta.correta;
      if (correta < 0 || correta >= opcoes.length) {
        throw new Error(`Selecione a opção correta da pergunta ${index + 1}.`);
      }

      return {
        enunciado: pergunta.enunciado.trim(),
        opcoes: opcoes.map((opcao) => opcao.trim()),
        correta,
      };
    });

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
        notaMinima: Number(notaMinima),
        perguntas: perguntasValidas,
      });

      setTitulo("");
      setDescricao("");
      setArea("");
      setNivel("iniciante");
      setNotaMinima(70);
      setPerguntas([criaPergunta()]);
      setFeedback({ type: "success", message: "Desafio criado com sucesso." });
      onCreated?.();
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Não foi possível criar o desafio.";
      setFeedback({ type: "error", message: mensagem });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-[24px] border border-[#dfeeff] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-[#123a5a]">Criar desafio</h2>
        <span className="rounded-full bg-[#edf6ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#123a5a]">Empresa</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Título</span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none transition focus:border-[#9ad4ff]"
            placeholder="Ex.: Desafio de comunicação"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Descrição</span>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none transition focus:border-[#9ad4ff]"
            placeholder="Descreva o objetivo e o que será avaliado."
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Área</span>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none transition focus:border-[#9ad4ff]"
            placeholder="Ex.: Marketing"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Nível</span>
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value as DesafioNivel)}
            className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none transition focus:border-[#9ad4ff]"
          >
            <option value="iniciante">Iniciante</option>
            <option value="intermediario">Intermediário</option>
            <option value="avancado">Avançado</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Nota mínima (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={notaMinima}
            onChange={(e) => setNotaMinima(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f9fcff] px-4 py-2.5 text-sm outline-none transition focus:border-[#9ad4ff]"
          />
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Perguntas</h3>
          <button
            type="button"
            onClick={adicionarPergunta}
            disabled={perguntas.length >= 5}
            className="rounded-full border border-[#cfe8ff] bg-[#f7fbff] px-3 py-1.5 text-xs font-semibold text-[#123a5a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Adicionar pergunta
          </button>
        </div>

        {perguntas.map((pergunta, perguntaIndex) => (
          <div key={perguntaIndex} className="rounded-[18px] border border-[#eaf4ff] bg-[#f9fcff] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-[#123a5a]">Pergunta {perguntaIndex + 1}</span>
              {perguntas.length > 1 && (
                <button
                  type="button"
                  onClick={() => removerPergunta(perguntaIndex)}
                  className="text-xs font-semibold text-red-600"
                >
                  Remover pergunta
                </button>
              )}
            </div>

            <textarea
              value={pergunta.enunciado}
              onChange={(e) => atualizarPergunta(perguntaIndex, "enunciado", e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-[#cfe8ff] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#9ad4ff]"
              placeholder="Ex.: Qual é o principal objetivo da campanha?"
            />

            <div className="mt-3 space-y-2">
              {pergunta.opcoes.map((opcao, opcaoIndex) => (
                <div key={opcaoIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={pergunta.correta === opcaoIndex}
                    onChange={() => atualizarPergunta(perguntaIndex, "correta", opcaoIndex)}
                    className="h-4 w-4 accent-[#123a5a]"
                  />
                  <input
                    value={opcao}
                    onChange={(e) => atualizarOpcao(perguntaIndex, opcaoIndex, e.target.value)}
                    className="w-full rounded-xl border border-[#cfe8ff] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#9ad4ff]"
                    placeholder={`Opção ${opcaoIndex + 1}`}
                  />
                  {pergunta.opcoes.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removerOpcao(perguntaIndex, opcaoIndex)}
                      className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600"
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
            </div>

            {pergunta.opcoes.length < 5 && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => adicionarOpcao(perguntaIndex)}
                  className="rounded-full border border-[#cfe8ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#123a5a]"
                >
                  Adicionar opção
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {feedback && (
        <p className={`text-sm ${feedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
          {feedback.message}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[#123a5a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d2d46] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Salvando..." : "Salvar desafio"}
        </button>
      </div>
    </form>
  );
}
