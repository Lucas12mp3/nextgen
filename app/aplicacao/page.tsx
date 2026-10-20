"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/firebase/config";
import { sair } from "@/services/autenticar";

export default function AplicacaoPage() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/login"); return; }
      setUsuario(user);
      setCarregando(false);
    });
  }, [router]);

  if (carregando) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Verificando acesso...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-white mb-1">Área Privada</h1>
        <p className="text-orange-400 font-medium mb-3">
          Olá, {usuario?.displayName ?? usuario?.email}!
        </p>
        <p className="text-gray-400 text-sm mb-6">
          Só usuários logados chegam até aqui.
        </p>
        <button
          onClick={() => sair().then(() => router.push("/"))}
          className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg border border-gray-700 transition-colors">
          Sair
        </button>
      </div>
    </main>
  );
}