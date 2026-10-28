"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import {
  enviarTentativa,
  getDesafio,
  subscribeConquistas,
  type Conquista,
  type Desafio,
} from "@/services/desafios";

type Resultado = {
  nota: number;
  acertos: number;
  aprovado: boolean;
};

export default function DesafioDetalhePage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const desafioId = typeof params?.id === "string" ? params.id : "";

  const [user, setUser] = useState<User | null>(null);
  const [tipoConta, setTipoConta] = useState<"empresa" | "estudante" | null>(null);
  const [desafio, setDesafio] = useState<Desafio | null>(null);
  const [conquista, setConquista] = useState<Conquista | null>(null);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }

      setUser(u);

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
        const perfil = typeof data?.tipoConta === "string" ? (data.tipoConta as "empresa" | "estudante") : null;
        setTipoConta(perfil);
      } catch {
        setTipoConta(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!desafioId) {
      return;
    }

    let active = true;

    async function carregarDesafio() {
      const item = await getDesafio(desafioId);

      if (!active) return;

      if (!item) {
        setDesafio(null);
        setError("Este desafio não existe ou foi removido.");
        return;
      }

      if (item.status !== "aberto") {
        setDesafio(item);
        setError("Este desafio está fechado no momento.");
        return;
      }

      setDesafio(item);
      setError("");
    }

    carregarDesafio();

    return () => {
      active = false;
    };
  }, [desafioId]);

  useEffect(() => {
    if (!user?.uid || !desafioId) return;

    const unsub = subscribeConquistas(user.uid, (items) => {
      const item = items.find((entry) => entry.desafioId === desafioId) ?? null;
      setConquista(item);
    });

    return () => unsub();
  }, [user?.uid, desafioId]);

  const totalPerguntas = desafio?.perguntas.length ?? 0;
  const perguntasRespondidas = desafio
    ? desafio.perguntas.filter((_, index) => typeof respostas[index] === "number" && respostas[index] >= 0).length
    : 0;
  const progresso = totalPerguntas > 0 ? Math.round((perguntasRespondidas / totalPerguntas) * 100) : 0;
  const todasRespondidas =
    totalPerguntas > 0 && desafio?.perguntas.every((_, index) => typeof respostas[index] === "number" && respostas[index] >= 0);

  function handleResposta(index: number, opcao: number) {
    setRespostas((prev) => ({ ...prev, [index]: opcao }));
  }

  async function enviarRespostas() {
    if (!desafio || !user || tipoConta !== "estudante") {
      setError("Você precisa estar logado como estudante para responder ao desafio.");
      return;
    }

    if (!todasRespondidas) {
      setError("Responda todas as perguntas antes de enviar.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await enviarTentativa(desafio.id, desafio.perguntas.map((_, index) => respostas[index]));
      setResultado({ nota: result.nota, acertos: result.acertos ?? 0, aprovado: result.aprovado });
      if (result.aprovado) setConquista({ id: `${user.uid}_${desafio.id}`, userId: user.uid, desafioId: desafio.id, desafioTitulo: desafio.titulo, empresaNome: desafio.empresaNome, nivel: desafio.nivel, nota: result.nota, pontos: result.pontos, createdAt: new Date() });
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível enviar as respostas."); }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] text-slate-800">
        <p className="text-sm font-medium text-slate-600">Carregando desafio...</p>
      </main>
    );
  }

  if (!desafioId) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-6 text-slate-800">
        <div className="mx-auto max-w-xl rounded-[24px] border border-[#dfeeff] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-[#123a5a]">Desafio indisponível</h1>
          <p className="mt-3 text-sm text-slate-600">Desafio não encontrado.</p>
          <Link href="/desafios" className="mt-5 inline-flex rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white">
            Voltar aos desafios
          </Link>
        </div>
      </main>
    );
  }

  if (!user || tipoConta !== "estudante") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-6 text-slate-800">
        <div className="mx-auto max-w-xl rounded-[24px] border border-[#dfeeff] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-[#123a5a]">Acesso restrito</h1>
          <p className="mt-3 text-sm text-slate-600">Esta página é exclusiva para estudantes logados.</p>
          <Link href="/login" className="mt-5 inline-flex rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white">
            Fazer login
          </Link>
        </div>
      </main>
    );
  }

  if (error && !desafio) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-6 text-slate-800">
        <div className="mx-auto max-w-xl rounded-[24px] border border-[#dfeeff] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-[#123a5a]">Desafio indisponível</h1>
          <p className="mt-3 text-sm text-slate-600">{error}</p>
          <Link href="/desafios" className="mt-5 inline-flex rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white">
            Voltar aos desafios
          </Link>
        </div>
      </main>
    );
  }

  if (!desafio) {
    return null;
  }

  if (conquista && !resultado) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-6 text-slate-800">
        <div className="mx-auto max-w-2xl rounded-[26px] border border-[#dfeeff] bg-white p-8 shadow-sm">
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Desafio concluído</p>
            <h1 className="mt-3 text-3xl font-black text-[#123a5a]">Parabéns!</h1>
            <p className="mt-2 text-sm text-slate-700">Você já concluíste este desafio com nota {conquista.nota}%.</p>
            <p className="mt-2 text-sm text-slate-600">{conquista.desafioTitulo} • {conquista.empresaNome}</p>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/perfils/estudante" className="rounded-full bg-[#123a5a] px-5 py-2.5 text-sm font-semibold text-white">
              Ir para o perfil
            </Link>
            <Link href="/desafios" className="rounded-full border border-[#cfe8ff] bg-[#f7fbff] px-5 py-2.5 text-sm font-semibold text-[#123a5a]">
              Ver mais desafios
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-[#dfeeff] bg-white p-5 shadow-[0_18px_42px_rgba(18,58,90,0.08)] md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b8eb8]">Desafio</p>
            <h1 className="mt-2 text-3xl font-black text-[#123a5a]">{desafio.titulo}</h1>
          </div>
          <Link href="/desafios" className="rounded-full border border-[#cfe8ff] bg-[#f7fbff] px-4 py-2 text-sm font-semibold text-[#123a5a]">
            Voltar
          </Link>
        </div>

        <div className="mt-5 grid gap-3 rounded-[20px] border border-[#dfeeff] bg-[#f9fcff] p-4 md:grid-cols-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Empresa</p>
            <p className="mt-1 text-sm font-semibold text-[#123a5a]">{desafio.empresaNome}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Nível</p>
            <p className="mt-1 text-sm font-semibold text-[#123a5a]">{desafio.nivel}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Área</p>
            <p className="mt-1 text-sm font-semibold text-[#123a5a]">{desafio.area}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Nota mínima</p>
            <p className="mt-1 text-sm font-semibold text-[#123a5a]">{desafio.notaMinima}%</p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-7 text-slate-700">{desafio.descricao}</p>

        <div className="mt-6 rounded-[20px] border border-[#dfeeff] bg-[#f9fcff] p-4">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold text-[#123a5a]">
            <span>Progresso</span>
            <span>{perguntasRespondidas}/{totalPerguntas}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#dfeeff]">
            <div className="h-full rounded-full bg-[#123a5a] transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-5">
          {desafio.perguntas.map((pergunta, index) => (
            <div key={index} className="rounded-[20px] border border-[#eaf4ff] bg-[#f9fcff] p-4">
              <p className="text-base font-black text-[#123a5a]">
                {index + 1}. {pergunta.enunciado}
              </p>
              <div className="mt-4 space-y-2">
                {pergunta.opcoes.map((opcao, opcaoIndex) => (
                  <label key={opcaoIndex} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#dfeeff] bg-white px-3 py-2.5 text-sm text-slate-700">
                    <input
                      type="radio"
                      checked={respostas[index] === opcaoIndex}
                      onChange={() => handleResposta(index, opcaoIndex)}
                      className="h-4 w-4 accent-[#123a5a]"
                    />
                    <span>{opcao}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {resultado && (
          <div
            className={`mt-6 rounded-[22px] border p-5 ${
              resultado.aprovado ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
            }`}
          >
            {resultado.aprovado ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Desafio concluído!</p>
                <h2 className="mt-3 text-2xl font-black text-[#123a5a]">Nota: {resultado.nota}%</h2>
                <p className="mt-2 text-sm text-slate-700">Você acertou {resultado.acertos} de {desafio.perguntas.length} perguntas.</p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Resultado</p>
                <h2 className="mt-3 text-2xl font-black text-[#123a5a]">Nota: {resultado.nota}%</h2>
                <p className="mt-2 text-sm text-slate-700">
                  Você acertou {resultado.acertos} de {desafio.perguntas.length} perguntas. A nota mínima era {desafio.notaMinima}%.
                </p>
              </>
            )}

            {resultado.aprovado ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/perfils/estudante" className="rounded-full bg-[#123a5a] px-5 py-2.5 text-sm font-semibold text-white">
                  Ir para o perfil
                </Link>
                <Link href="/desafios" className="rounded-full border border-[#cfe8ff] bg-white px-5 py-2.5 text-sm font-semibold text-[#123a5a]">
                  Ver outros desafios
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setResultado(null);
                  setRespostas({});
                  setError("");
                }}
                className="mt-4 rounded-full bg-[#123a5a] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {!resultado && !conquista && (
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={enviarRespostas}
              disabled={!todasRespondidas || submitting}
              className="rounded-full bg-[#123a5a] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {submitting ? "Enviando..." : "Enviar respostas"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
