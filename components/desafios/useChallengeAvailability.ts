"use client";
import { useEffect, useState } from "react";
export function availabilityMessage(reason: string) {
  if (["missing-credentials", "missing-project", "invalid-json", "project-mismatch", "invalid-email", "invalid-private-key"].includes(reason)) return "A publicação e a correção dos desafios aguardam ativação pela administração. Seu histórico permanece disponível.";
  return "Não foi possível verificar a disponibilidade dos desafios. Confira sua conexão e tente novamente.";
}
export function useChallengeStatus() {
  const [status, setStatus] = useState<{ available: boolean | null; reason: string }>({ available: null, reason: "checking" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/desafios", { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json();
      setStatus({ available: response.ok && data.available === true, reason: typeof data.reason === "string" ? data.reason : "unavailable" });
    }).catch(error => { if (error.name !== "AbortError") setStatus({ available: false, reason: "network-error" }); });
    return () => controller.abort();
  }, [attempt]);
  return { ...status, retry: () => { setStatus({ available: null, reason: "checking" }); setAttempt(value => value + 1); } };
}
