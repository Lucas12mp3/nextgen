"use client";
import Link from "next/link";
import { useState } from "react";
import { recuperarSenha } from "@/services/autenticar";

export default function PasswordRecoveryPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try { await recuperarSenha(email); setSent(true); }
    catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/user-not-found") setSent(true);
      else setError(code === "auth/too-many-requests" ? "Foram feitas muitas tentativas. Aguarde alguns minutos antes de tentar novamente." : code === "auth/invalid-email" ? "Confira o endereço de e-mail informado." : "Não foi possível enviar o e-mail. Confira sua conexão e tente novamente.");
    } finally { setBusy(false); }
  }
  return <main className="min-h-[70dvh] bg-[#edf6ff] px-4 py-12"><div className="mx-auto max-w-md rounded-3xl border border-[#dfeeff] bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Acesso à sua conta</p><h1 className="mt-3 text-3xl font-black">Recuperar senha</h1><p className="mt-4 text-sm leading-6 text-slate-600">Informe o e-mail usado no cadastro. Você receberá instruções para escolher uma nova senha.</p>{sent ? <p role="status" className="my-6 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">Se houver uma conta com esse e-mail, você receberá as instruções de recuperação. Confira também a pasta de spam.</p> : <form onSubmit={submit} className="my-6 space-y-4"><label className="block text-sm font-semibold">E-mail<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} className="mt-2 w-full rounded-xl border border-[#cfe8ff] px-4 py-3 font-normal" placeholder="seuemail@email.com" /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded-full bg-[#123a5a] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Enviando..." : "Enviar instruções"}</button></form>}<Link href="/login" className="inline-flex text-sm font-semibold text-[#123a5a] underline">← Voltar para entrar</Link></div></main>;
}
