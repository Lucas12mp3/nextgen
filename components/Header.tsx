"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import NotificationsButton from "@/components/proposals/NotificationsButton";
import BrandLogo from "@/components/BrandLogo";
import { getAdminSession } from "@/services/admin";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [profileType, setProfileType] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    const unsub = onAuthStateChanged(auth, async (u) => {
      setIsAdmin(false);
      if (u) void getAdminSession().then(session => { if (active && auth.currentUser?.uid === u.uid) setIsAdmin(session.isAdmin); }).catch(() => undefined);
      setUser(u);
      setProfileType(null);
      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          if (!active || auth.currentUser?.uid !== u.uid) return;
          const profile = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
          setProfileType(typeof profile?.tipoConta === "string" ? profile.tipoConta : null);
        } catch {
          setProfileType(null);
        }
      } else {
        setProfileType(null);
      }
    });
    return () => { active = false; unsub(); };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") { setMenuOpen(false); setMobileOpen(false); }
    }
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); document.removeEventListener("keydown", handleEscape); };
  }, []);

  async function handleSignOut() {
    try {
      await firebaseSignOut(auth);
      setMenuOpen(false);
      setMobileOpen(false);
    } catch (err) {
      console.error(err);
    }
  }

  const firstLetter = user?.displayName?.trim()?.[0] ?? user?.email?.trim()?.[0] ?? "N";

  return (
    <header className="relative z-40 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-y-3 border-b border-[#dfeeff] bg-[#f6fbff] px-4 py-4 sm:px-6 lg:px-10">
      <Link href="/" aria-label="NextGen — página inicial" onClick={() => { setMenuOpen(false); setMobileOpen(false); }} className="group flex items-center transition-transform duration-300 hover:scale-[1.02]">
        <BrandLogo compact showWordmark className="group-hover:drop-shadow-[0_8px_24px_rgba(36,113,190,0.18)]" />
      </Link>

      <nav aria-label="Navegação principal" className="hidden items-center gap-1 text-sm font-medium text-slate-700 md:flex">
        {[["/", "Início"], ["/feed", "Feed"], ["/vagas", "Vagas"], ["/desafios", "Desafios"], ["/ranking", "Ranking"]].map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`rounded-full px-3 py-2 transition ${pathname === href ? "bg-[#123a5a] text-white" : "hover:bg-white hover:text-[#123a5a]"}`}>{label}</Link>)}
      </nav>

      <div className="flex items-center justify-end gap-3">
        <button type="button" aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen(!mobileOpen)} className="rounded-full border border-[#cfe8ff] bg-white px-3 py-2 text-sm font-semibold md:hidden">{mobileOpen ? "Fechar" : "Menu"}</button>
        {user && <NotificationsButton />}

        {user ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => { setMenuOpen((prev) => !prev); setMobileOpen(false); }}
              aria-label="Menu da conta"
              aria-expanded={menuOpen}
              className="flex items-center gap-3 rounded-full border border-[#cfe8ff] bg-white px-2 py-1.5 shadow-sm transition hover:border-[#9ad4ff]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#123a5a] to-[#3c82c1] text-sm font-bold text-white">
                {firstLetter.toUpperCase()}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-2xl border border-[#1f2a37] bg-[#141b23] text-slate-100 shadow-2xl shadow-slate-900/40">
                <div className="border-b border-[#27313d] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#123a5a] to-[#5da5ec] text-sm font-bold text-white">
                      {firstLetter.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{user.displayName || user.email || "Usuário"}</p>
                      <p className="text-xs text-slate-400">{profileType === "empresa" ? "Empresa" : "Estudante"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 p-2">
                  {isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-sky-200 hover:bg-[#1d2733]">Administração</Link>}
                  <Link href={profileType === "empresa" ? "/perfils/empresa" : "/perfils/estudante"} onClick={() => setMenuOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-[#1d2733]">
                    <span>{profileType === "empresa" ? "Painel da empresa" : "Meu perfil"}</span>
                    <span>→</span>
                  </Link>
                  <Link href="/feed" onClick={() => setMenuOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-[#1d2733]">
                    <span>Feed</span>
                    <span>→</span>
                  </Link>
                  <Link href="/desafios" onClick={() => setMenuOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-[#1d2733]">
                    <span>Desafios</span>
                    <span>→</span>
                  </Link>
                  <Link href="/ranking" onClick={() => setMenuOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-[#1d2733]">
                    <span>Ranking</span>
                    <span>→</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-[#1d2733]"
                  >
                    <span>Sair</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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
              className="hidden rounded-full bg-[#123a5a] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-[#0f2f4d] sm:inline-flex"
            >
              Cadastrar
            </Link>
          </>
        )}
      </div>
      {mobileOpen && <nav id="mobile-navigation" aria-label="Navegação principal" className="order-last grid w-full grid-cols-3 gap-2 rounded-2xl border border-[#cfe8ff] bg-white p-3 shadow-sm md:hidden">
        {isAdmin && <Link href="/admin" onClick={() => setMobileOpen(false)} className="rounded-xl bg-sky-100 px-3 py-2 text-center text-sm font-semibold text-[#123a5a]">Administração</Link>}
        {[["/", "Início"], ["/feed", "Feed"], ["/vagas", "Vagas"], ["/desafios", "Desafios"], ["/ranking", "Ranking"], ...(user ? [[profileType === "empresa" ? "/perfils/empresa" : "/perfils/estudante", "Meu perfil"]] : [["/cadastro", "Cadastrar"]])].map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setMobileOpen(false)} className={`rounded-xl px-3 py-2 text-center text-sm font-semibold ${pathname === href ? "bg-[#123a5a] text-white" : "text-[#123a5a] hover:bg-[#edf6ff]"}`}>{label}</Link>)}
      </nav>}
    </header>
  );
}
