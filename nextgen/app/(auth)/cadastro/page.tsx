"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cadastrar } from "@/services/autenticar";

export default function CadastroPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [tipoConta, setTipoConta] = useState<"estudante" | "empresa">("estudante");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [ramo, setRamo] = useState("");
  const [isMinor, setIsMinor] = useState(false);
  const [respNome, setRespNome] = useState("");
  const [respEmail, setRespEmail] = useState("");
  const [respCpf, setRespCpf] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    // validações básicas no cliente
    if (senha !== confirmarSenha) {
      setErro("A confirmação de senha não corresponde.");
      setCarregando(false);
      return;
    }

    if (tipoConta === "estudante") {
      if (!cpf) {
        setErro("CPF é obrigatório para estudantes.");
        setCarregando(false);
        return;
      }
      if (!validateCPF(cpf)) {
        setErro("CPF inválido.");
        setCarregando(false);
        return;
      }
      if (!dataNascimento) {
        setErro("Data de nascimento é obrigatória.");
        setCarregando(false);
        return;
      }
      // valida idade (exige 16 anos ou mais para cadastro sem responsável)
      const hoje = new Date();
      const nasc = new Date(dataNascimento);
      let idade = hoje.getFullYear() - nasc.getFullYear();
      const m = hoje.getMonth() - nasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
      if (idade < 16) {
        // exige dados do responsável
        if (!respNome || !respEmail || !respCpf) {
          setErro("Menores de 16 anos exigem dados do responsável (nome, e-mail e CPF).");
          setCarregando(false);
          return;
        }
        if (!validateCPF(respCpf)) {
          setErro("CPF do responsável inválido.");
          setCarregando(false);
          return;
        }
      }
    }
    if (tipoConta === "empresa") {
      if (!cnpj) {
        setErro("CNPJ é obrigatório para empresas.");
        setCarregando(false);
        return;
      }
      if (!validateCNPJ(cnpj)) {
        setErro("CNPJ inválido.");
        setCarregando(false);
        return;
      }
    }

    try {
      const payload = {
        nome,
        email,
        senha,
        tipoConta,
        cpf: tipoConta === "estudante" ? cpf.replace(/\D/g, "") : undefined,
        cnpj: tipoConta === "empresa" ? cnpj.replace(/\D/g, "") : undefined,
        dataNascimento: tipoConta === "estudante" ? dataNascimento : undefined,
        ramo: tipoConta === "empresa" ? ramo : undefined,
        responsavel:
          tipoConta === "estudante" && respNome
            ? { nome: respNome, email: respEmail, cpf: respCpf.replace(/\D/g, "") }
            : null,
      } as any;

      await cadastrar(payload);
      // redireciona para o perfil conforme o tipo de conta
      if (tipoConta === "empresa") router.push("/perfils/empresa");
      else router.push("/perfils/estudante");
    } catch (err) {
      console.error(err);
      setErro("Erro ao criar conta. Verifique os dados e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  function onlyDigits(v: string) {
    return v.replace(/\D/g, "");
  }

  function formatCPF(v: string) {
    const d = onlyDigits(v).slice(0, 11);
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (m, a, b, c, d) => {
      return `${a}.${b}.${c}${d ? `-${d}` : ""}`;
    });
  }

  function validateCPF(v: string) {
    const s = onlyDigits(v);
    if (s.length !== 11) return false;
    if (/^([0-9])\1+$/.test(s)) return false;
    const calc = (t: number) => {
      let sum = 0;
      for (let i = 0; i < t; i++) sum += parseInt(s.charAt(i)) * (t + 1 - i);
      const r = (sum * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return calc(9) === parseInt(s.charAt(9)) && calc(10) === parseInt(s.charAt(10));
  }

  function formatCNPJ(v: string) {
    const d = onlyDigits(v).slice(0, 14);
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (m, a, b, c, d, e) => {
      return `${a}.${b}.${c}/${d}${e ? `-${e}` : ""}`;
    });
  }

  function validateCNPJ(v: string) {
    const s = onlyDigits(v);
    if (s.length !== 14) return false;
    if (/^([0-9])\1+$/.test(s)) return false;
    const t = s.length - 2;
    const d = s.substring(t);
    const calc = (x: number) => {
      let n = 0;
      let pos = x - 7;
      for (let i = x; i >= 1; i--) {
        n += parseInt(s.charAt(x - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      const res = n % 11 < 2 ? 0 : 11 - (n % 11);
      return res;
    };
    return `${calc(t)}${calc(t + 1)}` === d;
  }

  // handlers for masked inputs
  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    const formatted = formatCPF(val);
    setCpf(formatted);
  }

  function handleCnpjChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    const formatted = formatCNPJ(val);
    setCnpj(formatted);
  }

  function handleRespCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    const formatted = formatCPF(val);
    setRespCpf(formatted);
  }

  function handleDataNascimentoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setDataNascimento(val);
    if (!val) return setIsMinor(false);
    const hoje = new Date();
    const nasc = new Date(val);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    setIsMinor(idade < 16);
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

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#123a5a]">Comece agora</p>
            <h1 className="mt-5 max-w-sm text-4xl font-black leading-tight text-[#123a5a]">
              Construa seu perfil e descubra oportunidades para o futuro.
            </h1>
          </div>

          <div className="rounded-[28px] bg-white/65 p-5 shadow-sm ring-1 ring-white/60">
            <p className="text-sm font-semibold text-[#123a5a]">Cadastre-se como:</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>• jovem ou aprendiz em busca de estágio</li>
              <li>• empresa interessada em talentos</li>
              <li>• instituição ou mentor apoiando o crescimento</li>
            </ul>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eaf6ff] text-3xl shadow-sm">
                📝
              </div>
              <h2 className="text-3xl font-black text-[#123a5a]">Criar conta</h2>
              <p className="mt-2 text-sm text-slate-600">Conecte-se às melhores oportunidades</p>
            </div>

            <div className="mb-5 flex overflow-hidden rounded-2xl border border-[#dfeeff] bg-[#f4fbff] p-1">
              <button
                type="button"
                onClick={() => setTipoConta("estudante")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  tipoConta === "estudante"
                    ? "bg-[#123a5a] text-white shadow-md"
                    : "text-slate-600 hover:text-[#123a5a]"
                }`}
              >
                Estudante
              </button>
              <button
                type="button"
                onClick={() => setTipoConta("empresa")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  tipoConta === "empresa"
                    ? "bg-[#123a5a] text-white shadow-md"
                    : "text-slate-600 hover:text-[#123a5a]"
                }`}
              >
                Empresa
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {tipoConta === "estudante" ? "Nome completo" : "Razão social / Nome da empresa"}
                </label>
                <input
                  type="text"
                  placeholder={tipoConta === "estudante" ? "Seu nome" : "Nome da empresa"}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f8fbff] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#6fa8dc] focus:outline-none focus:ring-4 focus:ring-[#dfeeff]"
                />
              </div>

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

              {tipoConta === "estudante" ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">CPF</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={handleCpfChange}
                      required
                      className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f8fbff] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#6fa8dc] focus:outline-none focus:ring-4 focus:ring-[#dfeeff]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Data de Nascimento</label>
                    <input
                      type="date"
                      value={dataNascimento}
                      onChange={handleDataNascimentoChange}
                      required
                      className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f8fbff] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#6fa8dc] focus:outline-none focus:ring-4 focus:ring-[#dfeeff]"
                    />
                  </div>
                  {isMinor && (
                    <div className="mt-4 rounded-2xl border border-[#cfe8ff] bg-[#fff] p-4">
                      <h4 className="text-sm font-bold text-[#123a5a]">Dados do responsável</h4>
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">Nome do responsável</label>
                          <input
                            type="text"
                            value={respNome}
                            onChange={(e) => setRespNome(e.target.value)}
                            required
                            className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f8fbff] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#6fa8dc] focus:outline-none focus:ring-4 focus:ring-[#dfeeff]"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">E-mail do responsável</label>
                          <input
                            type="email"
                            value={respEmail}
                            onChange={(e) => setRespEmail(e.target.value)}
                            required
                            className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f8fbff] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#6fa8dc] focus:outline-none focus:ring-4 focus:ring-[#dfeeff]"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">CPF do responsável</label>
                          <input
                            type="text"
                            value={respCpf}
                            onChange={handleRespCpfChange}
                            placeholder="000.000.000-00"
                            required
                            className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f8fbff] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#6fa8dc] focus:outline-none focus:ring-4 focus:ring-[#dfeeff]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">CNPJ</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={handleCnpjChange}
                      required
                      className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f8fbff] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#6fa8dc] focus:outline-none focus:ring-4 focus:ring-[#dfeeff]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Ramo de atuação</label>
                    <input
                      type="text"
                      placeholder="Ex: Tecnologia, Educação, Saúde"
                      value={ramo}
                      onChange={(e) => setRamo(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f8fbff] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#6fa8dc] focus:outline-none focus:ring-4 focus:ring-[#dfeeff]"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Senha</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[#cfe8ff] bg-[#f8fbff] px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#6fa8dc] focus:outline-none focus:ring-4 focus:ring-[#dfeeff]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Confirmar senha</label>
                <input
                  type="password"
                  placeholder="Repita a senha"
                  minLength={6}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
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
                {carregando ? "Criando conta..." : "Criar conta"}
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
                Já tem conta?{" "}
                <Link href="/login" className="font-semibold text-[#123a5a] underline decoration-[#9ad4ff] underline-offset-4 hover:text-[#0f2f4d]">
                  Entrar
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}