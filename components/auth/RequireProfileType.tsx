'use client';

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";

type RequireProfileTypeProps = {
  allowed: "estudante" | "empresa";
  children: ReactNode;
};

export function RequireProfileType({ allowed, children }: RequireProfileTypeProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      setReady(false);
      setError("");
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!active || auth.currentUser?.uid !== user.uid) return;
      const profile = snap.exists() ? snap.data() : null;
      const tipoConta = profile?.tipoConta as "estudante" | "empresa" | undefined;

      if (tipoConta !== allowed) {
        const redirectTarget =
          tipoConta === "estudante"
            ? "/perfils/estudante"
            : tipoConta === "empresa"
              ? "/perfils/empresa"
              : "/login";

        router.replace(redirectTarget);
        return;
      }

      setReady(true);
      } catch { if (active) setError("Não foi possível verificar seu perfil. Confira sua conexão e tente novamente."); }
    });

    return () => { active = false; unsub(); };
  }, [allowed, router]);

  if (error) return <main className="mx-auto max-w-lg p-8 text-center"><p role="alert" className="text-red-700">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-full bg-[#123a5a] px-4 py-2 text-white">Tentar novamente</button></main>;

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return <>{children}</>;
}
