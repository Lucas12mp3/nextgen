"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { entrar } from "@/services/autenticar";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      await entrar(email, senha);
      router.push("/aplicacao");
    } catch {
      setErro("E-mail ou senha incorretos.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] px-4 py-10 text-slate-800">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[32px] border border-[#dfeeff] bg-white/80 shadow-[0_24px_80px_rgba(31,84,138,0.12)] backdrop-blur-sm lg:grid-cols-[1fr_1.1fr]">
        <section className="hidden bg-gradient-to-br from-[#dfeeff] via-[#cfe8ff] to-[#b8d9ff] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9ad4ff] via-[#6fa8dc] to-[#123a5a] text-xl font-black text-white shadow-lg shadow-blue-200">
                N
              </div>
              <span className="text-2xl font-black tracking-tight text-[#123a5a]">NextGen</span>
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#123a5a]">Bem-vindo de volta</p>
            <h1 className="mt-5 max-w-sm text-4xl font-black leading-tight text-[#123a5a]">
              Acesse seu futuro com oportunidades em movimento.
            </h1>
          </div>

          <div className="rounded-[28px] bg-white/65 p-5 shadow-sm ring-1 ring-white/60">
            <p className="text-sm font-semibold text-[#123a5a]">Você está a um passo de:</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>• descobrir vagas e estágios</li>
              <li>• mostrar suas habilidades</li>
              <li>• conectar-se com empresas e mentores</li>
            </ul>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eaf6ff] text-3xl shadow-sm">
                🔑
              </div>
              <h2 className="text-3xl font-black text-[#123a5a]">Entrar</h2>
              <p className="mt-2 text-sm text-slate-600">Acesse sua conta no NextGen</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">E-mail</label>
                <input
                  type="email"
                  placeholder="seuemail@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f8fbff] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#6fa8dc] focus:outline-none focus:ring-4 focus:ring-[#dfeeff]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Senha</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f8fbff] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#6fa8dc] focus:outline-none focus:ring-4 focus:ring-[#dfeeff]"
                />
              </div>

              {erro && <p className="text-sm font-medium text-red-500">{erro}</p>}

              <button
                type="submit"
                disabled={carregando}
                className="w-full rounded-2xl bg-[#123a5a] px-4 py-3 text-base font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-[#0f2f4d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {carregando ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="mt-6 space-y-3 text-center text-sm text-slate-600">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-[#cfe8ff] bg-white px-4 py-2 font-semibold text-[#123a5a] transition hover:bg-[#f4fbff]"
              >
                ← Voltar para a página inicial
              </Link>

              <div>
                Não tem conta?{" "}
                <Link href="/cadastro" className="font-semibold text-[#123a5a] underline decoration-[#9ad4ff] underline-offset-4 hover:text-[#0f2f4d]">
                  Cadastre-se
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
