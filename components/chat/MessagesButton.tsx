"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isUnread, subscribeConversations } from "@/services/chat";
import { subscribeFriendships } from "@/services/social";

export default function MessagesButton({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);
  const [requests, setRequests] = useState(0);
  useEffect(() => subscribeConversations(userId, chats => setCount(chats.filter(chat => isUnread(chat, userId)).length), () => setCount(0)), [userId]);
  useEffect(() => subscribeFriendships(userId, friends => setRequests(friends.filter(f => f.status === "pending" && f.requestedBy !== userId).length), () => setRequests(0)), [userId]);
  const total = count + requests;
  return <Link href={requests && !count ? "/mensagens?view=friends" : "/mensagens"} aria-label={`Mensagens: ${count} conversas não lidas e ${requests} pedidos de amizade`} className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#cfe8ff] bg-white text-[#123a5a] hover:bg-sky-50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H4l-2 2v-10a9 9 0 0 1 18 0Z" /><path d="M7 10h8M7 14h5" /></svg>{total > 0 && <span aria-hidden="true" className="absolute -right-2 -top-2 min-w-5 rounded-full bg-sky-600 px-1 text-center text-[10px] font-bold leading-5 text-white">{total > 99 ? "99+" : total}</span>}</Link>;
}
