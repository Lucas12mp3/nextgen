"use client";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { subscribeUserProposals } from "@/services/proposals";
import { subscribeCompanyApplications } from "@/services/applications";
import Link from "next/link";

type ProposalRecord = Record<string, unknown> & { read?: boolean; };
type ApplicationRecord = Record<string, unknown> & { read?: boolean; };

export default function NotificationsButton() {
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);

  useEffect(() => {
    let unsubProposals: (() => void) | undefined;
    let unsubApplications: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubProposals) unsubProposals();
      if (unsubApplications) unsubApplications();

      if (!user) {
        setProposals([]);
        setApplications([]);
        return;
      }

      unsubProposals = subscribeUserProposals(user.uid, (items) => setProposals(items));
      unsubApplications = subscribeCompanyApplications(user.uid, (items) => setApplications(items));
    });

    return () => {
      unsubAuth();
      if (unsubProposals) unsubProposals();
      if (unsubApplications) unsubApplications();
    };
  }, []);

  const unreadCount = useMemo(
    () => proposals.filter((proposal) => !proposal.read).length + applications.filter((application) => !application.read).length,
    [proposals, applications]
  );

  return (
    <div className="relative">
      <Link href="/notifications" className="rounded-full border border-[#cfe8ff] bg-white px-3 py-1 text-sm font-semibold text-[#123a5a]">
        🔔
      </Link>
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">{unreadCount}</span>
      )}
    </div>
  );
}
