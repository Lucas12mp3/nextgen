"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { entrar, sair } from "@/services/autenticar";
import { auth, db } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import BrandLogo from "@/components/BrandLogo";
import { authErrorMessage } from "@/services/auth-errors";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const enviando = useRef(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let sequence = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = onAuthStateChanged(auth, user => {
      const request = ++sequence;
      clearTimeout(timer);
      setAutenticado(!!user); setErro("");
      if (!user) { setVerificando(false); return; }
      setVerificando(true);
      const current = () => active && sequence === request && auth.currentUser?.uid === user.uid;
      timer = setTimeout(() => {
        if (!current()) return;
        sequence++;
        setVerificando(false);
        setErro("Sua conta entrou, mas o perfil demorou para carregar. Confira a conexão e use Verificar novamente.");
      }, 12000);
      void getDoc(doc(db, "users", user.uid)).then(snap => {
        if (!current()) return;
        const type = snap.get("tipoConta");
        if (!snap.exists() || !["empresa", "estudante"].includes(type)) throw new Error("Sua conta entrou, mas o perfil não foi encontrado ou está incompleto. Procure a administração para recuperar o cadastro.");
        router.replace(type === "empresa" ? "/perfils/empresa" : "/perfils/estudante");
      }).catch(error => {
        if (current()) {
          setVerificando(false);
          setErro(authErrorMessage(error, "Sua conta entrou, mas não foi possível carregar o perfil. Confira a conexão e tente novamente."));
        }
      }).finally(() => { if (sequence === request) clearTimeout(timer); });
    });
    return () => { active = false; clearTimeout(timer); stop(); };
  }, [router, tentativa]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enviando.current) return;
    enviando.current = true;
    setErro("");
    setCarregando(true);

    try {
      await entrar(email, senha);
    } catch (error) {
      setErro(authErrorMessage(error, "Não foi possível entrar. Tente novamente."));
    } finally {
      enviando.current = false;
      setCarregando(false);
    }
  }

  if (verificando || autenticado) return <main className="min-h-[70dvh] bg-[#edf6ff] px-4 py-12 text-slate-800"><div className="mx-auto max-w-lg rounded-3xl border border-[#dfeeff] bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-black text-[#123a5a]">{verificando ? "Acessando sua conta" : "Sua conta está conectada"}</h1>{erro ? <p role="alert" className="my-5 text-sm leading-7 text-red-700">{erro}</p> : <p role="status" className="my-5 text-sm text-slate-600">Verificando seu perfil para abrir a página correta...</p>}<div className="flex flex-wrap justify-center gap-3">{!verificando && <button type="button" onClick={() => setTentativa(value => value + 1)} className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white">Verificar novamente</button>}<Link href="/" className="rounded-full border border-[#cfe8ff] px-4 py-2 text-sm font-semibold text-[#123a5a]">Página inicial</Link>{!verificando && <button type="button" onClick={() => void sair().catch(error => setErro(authErrorMessage(error, "Não foi possível sair. Tente novamente.")))} className="px-4 py-2 text-sm font-semibold underline">Entrar com outra conta</button>}</div></div></main>;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] px-4 py-10 text-slate-800">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[32px] border border-[#dfeeff] bg-white/80 shadow-[0_24px_80px_rgba(31,84,138,0.12)] backdrop-blur-sm lg:grid-cols-[1fr_1.1fr]">
        <section className="hidden bg-gradient-to-br from-[#dfeeff] via-[#cfe8ff] to-[#b8d9ff] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <BrandLogo compact className="mb-6" textClassName="!text-[2rem]" />

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
                <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">E-mail</label>
                <input
                  id="login-email"
                  autoComplete="email"
                  type="email"
                  placeholder="seuemail@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f8fbff] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#6fa8dc] focus:outline-none focus:ring-4 focus:ring-[#dfeeff]"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-700">Senha</label>
                <input
                  id="login-password"
                  autoComplete="current-password"
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f8fbff] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#6fa8dc] focus:outline-none focus:ring-4 focus:ring-[#dfeeff]"
                />
              </div>

              {erro && <p role="alert" className="text-sm font-medium text-red-500">{erro}</p>}

              <button
                type="submit"
                disabled={carregando}
                className="w-full rounded-2xl bg-[#123a5a] px-4 py-3 text-base font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-[#0f2f4d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {carregando ? "Entrando..." : "Entrar"}
              </button>
            </form>
            <div className="mt-4 text-right"><Link href="/recuperar-senha" className="text-sm font-semibold text-[#123a5a] underline">Esqueci minha senha</Link></div>

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
