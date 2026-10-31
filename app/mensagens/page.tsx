import { Suspense } from "react";
import ChatWorkspace from "@/components/chat/ChatWorkspace";

export default function MessagesPage() {
  return <Suspense fallback={<main className="p-8 text-center" role="status">Abrindo mensagens...</main>}><ChatWorkspace /></Suspense>;
}
