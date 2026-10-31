import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { ChallengeError } from "@/lib/challenge-policy";
import { resolveChallengeConfig } from "./challenge-config";

export function challengeServerConfigured() {
  return resolveChallengeConfig(process.env).available;
}
export function challengeAvailability() {
  const { available, reason } = resolveChallengeConfig(process.env);
  return { available, reason };
}
export function adminServices() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const emulator = process.env.NODE_ENV === "test" && projectId?.startsWith("demo-") && !!process.env.FIRESTORE_EMULATOR_HOST && !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const config = resolveChallengeConfig(process.env);
  if (!emulator && !config.available) throw new ChallengeError(503, "A administração precisa concluir a ativação dos desafios. O envio ficará disponível após a configuração segura.");
  const app = getApps().find(item => item.name === "nextgen-challenges") || initializeApp({ projectId: emulator ? projectId! : config.credentials!.projectId,
    ...(emulator ? {} : { credential: cert(config.credentials!) }) }, "nextgen-challenges");
  return { auth: getAuth(app), db: getFirestore(app) };
}
