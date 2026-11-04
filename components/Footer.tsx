import Link from "next/link";
export default function Footer() {
  return <footer className="mt-auto border-t border-[#dfeeff] bg-white px-5 py-5 text-sm text-slate-500"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><p>NextGen · Projeto acadêmico</p><nav aria-label="Informações e ajuda" className="flex flex-wrap gap-5"><Link className="font-semibold text-[#123a5a] hover:underline" href="/privacidade">Privacidade e ajuda</Link><Link className="text-[#123a5a] hover:underline" href="/#sobre">Sobre o projeto</Link><Link className="text-[#123a5a] hover:underline" href="/">Página inicial</Link></nav></div></footer>;
}
