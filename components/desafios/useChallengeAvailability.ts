"use client";
import { useEffect, useState } from "react";
export function useChallengeAvailability() {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/desafios", { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json(); setAvailable(response.ok && data.available === true);
    }).catch(error => { if (error.name !== "AbortError") setAvailable(false); });
    return () => controller.abort();
  }, []);
  return available;
}
