"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/firebase/config";
import { subscribeUserProposals } from "@/services/proposals";
import { subscribeCompanyApplications } from "@/services/applications";
import Link from "next/link";

export default function NotificationsButton() {
  const [user, setUser] = useState<User | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    let unsubProposals: any;
    let unsubApplications: any;
    if (user) {
      unsubProposals = subscribeUserProposals(user.uid, (items) => setProposals(items.filter((p) => !p.read)));
      // also subscribe to applications if user is a company
      unsubApplications = subscribeCompanyApplications(user.uid, (items) => setProposals((prev) => {
        const apps = items.filter((a) => !a.read).map((a) => ({ ...a, __type: 'application' }));
        return [...prev.filter(Boolean), ...apps];
      }));
    } else {
      setProposals([]);
    }
    return () => {
      unsubAuth();
      if (unsubProposals) unsubProposals();
      if (unsubApplications) unsubApplications();
    };
  }, [user]);

  return (
    <div className="relative">
      <Link href="/notifications" className="rounded-full border border-[#cfe8ff] bg-white px-3 py-1 text-sm font-semibold text-[#123a5a]">
        🔔
      </Link>
      {proposals.length > 0 && (
        <span className="absolute -top-2 -right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">{proposals.length}</span>
      )}
    </div>
  );
}
