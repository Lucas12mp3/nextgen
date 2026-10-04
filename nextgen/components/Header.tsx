"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import NotificationsButton from "@/components/proposals/NotificationsButton";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [profileType, setProfileType] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          if (snap.exists()) setProfileType((snap.data() as any).tipoConta ?? null);
        } catch (e) {
          setProfileType(null);
        }
      } else {
        setProfileType(null);
      }
    });
    return () => unsub();
  }, []);

  async function handleSignOut() {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9ad4ff] via-[#6fa8dc] to-[#123a5a] text-xl font-black text-white shadow-lg shadow-blue-200">N</div>
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
        {user ? (
          <>
            <Link href="/feed" className="rounded-full border border-[#cfe8ff] bg-white px-4 py-2 text-sm font-semibold text-[#123a5a] transition hover:border-[#9ad4ff] hover:bg-[#f5fbff]">Feed</Link>
            <Link href={profileType === "empresa" ? "/perfils/empresa" : "/perfils/estudante"} className="rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-[#0f2f4d]">Meu perfil</Link>
            <NotificationsButton />
            <button onClick={handleSignOut} className="rounded-full bg-red-50 text-red-700 px-3 py-1 text-sm">Sair</button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </header>
  );
}
