import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { ChallengeError } from "@/lib/challenge-policy";

export function challengeServerConfigured() {
  return !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID));
}
export function adminServices() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const emulator = process.env.NODE_ENV === "test" && projectId?.startsWith("demo-") && !!process.env.FIRESTORE_EMULATOR_HOST && !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!projectId || (!emulator && !challengeServerConfigured())) throw new ChallengeError(503, "Os desafios estão temporariamente indisponíveis. A administração precisa concluir a configuração da correção segura.");
  if (!emulator && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) throw new ChallengeError(503, "A configuração dos desafios precisa ser revisada pela administração.");
  const app = getApps().find(item => item.name === "nextgen-challenges") || initializeApp({ projectId,
    ...(emulator ? {} : { credential: cert({ projectId, clientEmail: process.env.FIREBASE_CLIENT_EMAIL!, privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n") }) }) }, "nextgen-challenges");
  return { auth: getAuth(app), db: getFirestore(app) };
}
