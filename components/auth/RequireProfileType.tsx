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
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
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
    });

    return () => unsub();
  }, [allowed, router]);

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return <>{children}</>;
}
