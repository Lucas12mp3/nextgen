"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, limit, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { subscribeUserProposals } from "@/services/proposals";
import { subscribeCompanyApplications } from "@/services/applications";
import Link from "next/link";

export default function NotificationsButton() {
  const [proposals, setProposals] = useState(0);
  const [applications, setApplications] = useState(0);
  const [warnings, setWarnings] = useState(0);
  useEffect(() => {
    let stopProfile: (() => void) | undefined;
    let stopWarnings: (() => void) | undefined;
    let stopProposals: (() => void) | undefined;
    let stopApplications: (() => void) | undefined;
    function stopMessages() { stopProposals?.(); stopApplications?.(); setProposals(0); setApplications(0); }
    const stopAuth = onAuthStateChanged(auth, user => {
      stopProfile?.(); stopWarnings?.(); stopMessages(); setWarnings(0);
      if (!user) return;
      stopWarnings = onSnapshot(query(collection(db, "users", user.uid, "advertencias"), where("readAt", "==", null), limit(100)), snap => setWarnings(snap.size), () => setWarnings(0));
      stopProfile = onSnapshot(doc(db, "users", user.uid), snap => {
        stopMessages();
        if (snap.get("tipoConta") === "estudante") {
          stopProposals = subscribeUserProposals(user.uid, items => setProposals(items.filter(item => !item.read).length), () => setProposals(0));
        } else if (snap.get("tipoConta") === "empresa" && snap.get("companyStatus") === "verified") {
          stopApplications = subscribeCompanyApplications(user.uid, items => setApplications(items.filter(item => !item.read).length), () => setApplications(0));
        }
      }, stopMessages);
    });
    return () => { stopAuth(); stopProfile?.(); stopWarnings?.(); stopProposals?.(); stopApplications?.(); };
  }, []);
  const unreadCount = proposals + applications + warnings;
  return <div className="relative">
    <Link href="/notifications" aria-label={unreadCount ? "Notificações: " + (unreadCount > 99 ? "mais de 99" : unreadCount) + " não lidas" : "Notificações"} className="rounded-full border border-[#cfe8ff] bg-white px-3 py-1 text-sm font-semibold text-[#123a5a]">🔔</Link>
    {unreadCount > 0 && <span aria-hidden="true" className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
  </div>;
}
