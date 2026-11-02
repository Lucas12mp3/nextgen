"use client";

import { useEffect, useState } from "react";
import { isOnline, type ChatPresence } from "@/services/chat-policy";
import { subscribeChatStatus } from "@/services/social";

export function useContactStatus(userId: string | undefined, allowed: boolean) {
  const [record, setRecord] = useState<{ uid: string; status: ChatPresence | null } | null>(null);
  useEffect(() => {
    if (!userId || !allowed) return;
    return subscribeChatStatus(userId, status => setRecord({ uid: userId, status }), () => setRecord(null));
  }, [userId, allowed]);
  return allowed && record && record.uid === userId ? record.status : null;
}

export function ActivityBadge({ status }: { status: ChatPresence | null }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 10_000);
    // Schedule the first check so rendering remains deterministic on the server.
    const first = window.setTimeout(refresh, 0);
    return () => { window.clearInterval(timer); window.clearTimeout(first); };
  }, []);
  if (!status?.showOnline) return null;
  const online = isOnline(status, now);
  return <span title="Atividade recente no site. O indicador pode levar até dois minutos para atualizar após sair." className={`inline-flex items-center gap-1.5 text-xs ${online ? "text-emerald-700" : "text-slate-500"}`}>
    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-300"}`} />{online ? "Online agora" : "Offline"}
  </span>;
}

export default function PresenceBadge({ userId, allowed = true }: { userId: string; allowed?: boolean }) {
  const status = useContactStatus(userId, allowed);
  return <ActivityBadge status={status} />;
}
