import Link from "next/link";

const stats = [
  { value: "+8k", label: "jovens conectados" },
  { value: "300+", label: "empresas ativas" },
  { value: "92%", label: "satisfação dos usuários" },
];

const benefits = [
  {
    icon: "🚀",
    title: "Primeiras oportunidades",
    description:
      "Conecte jovens e aprendizes a estágios, programas e vagas ideais para iniciar sua carreira.",
  },
  {
    icon: "🛡️",
    title: "Ambiente seguro",
    description:
      "Estrutura pensada para menores de idade, com organização, privacidade e regras claras.",
  },
  {
    icon: "🤝",
    title: "Rede de apoio",
    description:
      "Conecte jovens com empresas, mentores, escolas e projetos que fazem diferença.",
  },
];

const opportunities = [
  { title: "Estágio em Tecnologia", company: "NovaTech", type: "Presencial", tag: "TI" },
  { title: "Jovem Aprendiz em Marketing", company: "BlueWave", type: "Híbrido", tag: "Marketing" },
  { title: "Assistente Administrativo", company: "Future Labs", type: "Remoto", tag: "Administração" },
  { title: "Programa de Aprendizagem", company: "EduCarreira", type: "Online", tag: "Educação" },
];

const steps = [
  "Crie seu perfil com habilidades e interesses.",
  "Descubra oportunidades de estágio e aprendizado.",
  "Conecte-se com empresas e siga seu desenvolvimento.",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dfeeff_0%,_#f6fbff_34%,_#edf6ff_100%)] text-slate-800">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9ad4ff] via-[#6fa8dc] to-[#123a5a] text-xl font-black text-white shadow-lg shadow-blue-200">
            N
          </div>
          <div>
            <p className="text-lg font-black tracking-tight text-[#123a5a]">NextGen</p>
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <a href="#sobre" className="transition hover:text-[#123a5a]">Sobre</a>
          <a href="#beneficios" className="transition hover:text-[#123a5a]">Benefícios</a>
          <a href="#oportunidades" className="transition hover:text-[#123a5a]">Oportunidades</a>
          <a href="#empresas" className="transition hover:text-[#123a5a]">Empresas</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold text-[#123a5a] transition hover:border-[#9ad4ff] hover:bg-[#f5fbff]"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-[#0f2f4d]"
          >
            Cadastrar
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pb-16 pt-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:pb-20 lg:pt-14">
        <div>
          <span className="inline-flex items-center rounded-full border border-[#b9dcff] bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#123a5a] shadow-sm">
            Conectando jovens ao futuro
          </span>

          <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight tracking-tight text-[#123a5a] md:text-5xl lg:text-6xl">
            O lugar onde jovens aprendem, crescem e encontram oportunidades.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            O NextGen conecta menores de idade e aprendizes a empresas, escolas e projetos que
            ajudam a construir uma carreira com segurança, desenvolvimento e propósito.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/cadastro"
              className="rounded-full bg-[#123a5a] px-6 py-3 text-center text-base font-semibold text-white shadow-xl shadow-blue-200 transition hover:bg-[#0f2f4d]"
            >
              Quero começar
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-[#b9dcff] bg-white px-6 py-3 text-center text-base font-semibold text-[#123a5a] transition hover:bg-[#f4fbff]"
            >
              Ver oportunidades
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-8 text-sm text-slate-600">
            {stats.map((item) => (
              <div key={item.label}>
                <p className="text-2xl font-black text-[#123a5a]">{item.value}</p>
                <p>{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-8 top-10 h-40 w-40 rounded-full bg-[#a9d6ff]/70 blur-3xl" />
          <div className="absolute -right-10 bottom-6 h-40 w-40 rounded-full bg-[#ffd166]/40 blur-3xl" />

          <div className="relative overflow-hidden rounded-[32px] border border-[#d7ebff] bg-white/80 p-5 shadow-[0_24px_80px_rgba(31,84,138,0.14)] backdrop-blur-sm">
            <div className="rounded-[24px] bg-gradient-to-br from-[#eaf6ff] via-[#dfeeff] to-[#cfe8ff] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#123a5a]">Perfil em destaque</p>
                  <h2 className="mt-2 text-2xl font-black text-[#123a5a]">Ana Clara</h2>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffd166] to-[#ffbf47] text-2xl shadow-sm">
                  👩‍🎓
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Interesses</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Design', 'Tecnologia', 'Marketing', 'Inglês'].map((skill) => (
                      <span key={skill} className="rounded-full bg-[#eaf6ff] px-3 py-1 text-xs font-semibold text-[#123a5a]">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#123a5a] p-4 text-white shadow-md">
                    <p className="text-xs uppercase tracking-[0.18em] text-blue-100">Projetos</p>
                    <p className="mt-2 text-3xl font-black">12</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Habilidades</p>
                    <p className="mt-2 text-3xl font-black text-[#123a5a]">8</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Por que escolher o NextGen</p>
          <h2 className="mt-4 text-3xl font-black text-[#123a5a] md:text-4xl">
            Uma plataforma feita para crescer com o futuro.
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="rounded-[28px] border border-[#dfeeff] bg-white p-7 shadow-[0_18px_45px_rgba(31,84,138,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(31,84,138,0.12)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf6ff] text-2xl shadow-sm">
                {benefit.icon}
              </div>
              <h3 className="mt-6 text-xl font-bold text-[#123a5a]">{benefit.title}</h3>
              <p className="mt-3 text-base leading-7 text-slate-600">{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="oportunidades" className="bg-[#f4fbff] py-16">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Oportunidades</p>
              <h2 className="mt-3 text-3xl font-black text-[#123a5a] md:text-4xl">Descubra vagas feitas para começar</h2>
            </div>
            <button className="rounded-full border border-[#bfdcff] bg-white px-5 py-3 text-sm font-semibold text-[#123a5a] transition hover:bg-[#edf8ff]">
              Ver todas
            </button>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {opportunities.map((opportunity) => (
              <article key={opportunity.title} className="rounded-[26px] border border-[#dfeeff] bg-white p-5 shadow-[0_18px_45px_rgba(31,84,138,0.06)]">
                <span className="inline-flex rounded-full bg-[#eaf6ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#123a5a]">
                  {opportunity.tag}
                </span>
                <h3 className="mt-4 text-xl font-bold text-[#123a5a]">{opportunity.title}</h3>
                <p className="mt-2 text-sm font-medium text-slate-500">{opportunity.company}</p>
                <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
                  <span>{opportunity.type}</span>
                  <button className="rounded-full bg-[#123a5a] px-3 py-1.5 font-semibold text-white transition hover:bg-[#0f2f4d]">
                    Aplicar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="empresas" className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#123a5a]">Para empresas</p>
            <h2 className="mt-4 text-3xl font-black text-[#123a5a] md:text-4xl">
              Encontre talentos jovens com potencial e vontade de aprender.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Empresas podem publicar vagas, divulgar programas de aprendizagem e conectar-se com
              estudantes em fase de desenvolvimento profissional.
            </p>

            <div className="mt-8 space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e4f1ff]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dfeeff] text-sm font-black text-[#123a5a]">
                    {index + 1}
                  </div>
                  <p className="text-base text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-[#dfeeff] bg-gradient-to-br from-[#edf7ff] via-[#dfeeff] to-[#cfe8ff] p-6 shadow-[0_24px_80px_rgba(31,84,138,0.12)]">
            <div className="rounded-[26px] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Empresa</p>
                  <h3 className="mt-2 text-2xl font-black text-[#123a5a]">BrightPath</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf6ff] text-2xl">
                  💼
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-[#f7fbff] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Vagas abertas</p>
                  <p className="mt-2 text-3xl font-black text-[#123a5a]">18</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#123a5a] p-4 text-white">
                    <p className="text-xs uppercase tracking-[0.16em] text-blue-100">Candidatos</p>
                    <p className="mt-2 text-2xl font-black">1.2k</p>
                  </div>
                  <div className="rounded-2xl bg-[#ffd166] p-4 text-[#123a5a]">
                    <p className="text-xs uppercase tracking-[0.16em]">Contratações</p>
                    <p className="mt-2 text-2xl font-black">96</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#dfeeff] bg-white/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-8 text-sm text-slate-600 md:flex-row md:items-center md:justify-between lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#9ad4ff] via-[#6fa8dc] to-[#123a5a] text-lg font-black text-white">
              N
            </div>
            <span className="font-black text-[#123a5a]">NextGen</span>
          </div>

          <div className="flex flex-wrap gap-5">
            <a href="#sobre" className="transition hover:text-[#123a5a]">Sobre</a>
            <a href="#beneficios" className="transition hover:text-[#123a5a]">Benefícios</a>
            <a href="#oportunidades" className="transition hover:text-[#123a5a]">Oportunidades</a>
            <a href="#empresas" className="transition hover:text-[#123a5a]">Empresas</a>
          </div>

          <p>© 2026 NextGen</p>
        </div>
      </footer>
    </main>
  );
}
