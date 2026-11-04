"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { DEFAULT_CHAT_PREFERENCES, type ChatPresence } from "@/services/chat-policy";
import { heartbeat, subscribeChatStatus } from "@/services/social";

type Activity = { userId: string | null; status: ChatPresence; ready: boolean; error: string };
const initial: Activity = { userId: null, status: { ...DEFAULT_CHAT_PREFERENCES, lastActiveAt: null }, ready: false, error: "" };
const ActivityContext = createContext<Activity>(initial);
export const useChatActivity = () => useContext(ActivityContext);

export default function ChatActivityProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => onAuthStateChanged(auth, user => setUserId(user?.uid ?? null)), []);
  const [activity, setActivity] = useState<Activity>(initial);
  useEffect(() => {
    if (!userId) return;
    return subscribeChatStatus(userId, status => setActivity({ userId, status: status ?? initial.status, ready: true, error: "" }),
      () => setActivity({ ...initial, userId, error: "Não foi possível carregar sua privacidade. Confira a conexão e a publicação das regras." }));
  }, [userId]);
  const current = activity.userId === userId ? activity : { ...initial, userId };

  useEffect(() => {
    if (!userId || !current.ready || !current.status.showOnline) return;
    let busy = false, lastAttempt = 0;
    function pulse() {
      if (busy || document.hidden || !navigator.onLine || auth.currentUser?.uid !== userId || Date.now() - lastAttempt < 40_000) return;
      busy = true; lastAttempt = Date.now();
      // A lease expires by itself; closing one tab must not mark other tabs offline.
      void heartbeat().catch(() => undefined).finally(() => { busy = false; });
    }
    pulse();
    const timer = window.setInterval(pulse, 45_000);
    document.addEventListener("visibilitychange", pulse); window.addEventListener("online", pulse);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", pulse); window.removeEventListener("online", pulse); };
  }, [userId, current.ready, current.status.showOnline]);
  // Keep the same provider and child position during sign-in/out. Replacing the
  // wrapper remounts pages and invalidates pending login/registration navigation.
  return <ActivityContext.Provider value={current}>{children}</ActivityContext.Provider>;
}
