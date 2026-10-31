import "server-only";
import { ChallengeError } from "@/lib/challenge-policy";
import { adminServices } from "./firebase-admin";
import { challengeService } from "./challenge-service";

export async function challengeRequest(request: Request, operation: "create" | "close" | "submit" | "result") {
  const headers = { "Cache-Control": "no-store" };
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new ChallengeError(403, "Origem da solicitação inválida.");
    const token = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/)?.[1];
    if (!token || token.length > 8192) throw new ChallengeError(401, "Entre na sua conta para continuar.");
    const { auth, db } = adminServices();
    let uid: string;
    try { uid = (await auth.verifyIdToken(token, true)).uid; }
    catch { throw new ChallengeError(401, "Sua sessão expirou. Entre novamente para continuar."); }
    const service = challengeService(db);
    if (operation === "result") return Response.json({ result: await service.result(uid, new URL(request.url).searchParams.get("id")) }, { headers });
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ChallengeError(415, "Envie os dados no formato JSON.");
    const reader = request.body?.getReader();
    if (!reader) throw new ChallengeError(400, "Dados ausentes.");
    let length = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 131072) { await reader.cancel(); throw new ChallengeError(413, "O desafio ultrapassa o limite de tamanho."); }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new ChallengeError(400, "Dados inválidos."); }
    return Response.json(await service[operation](uid, body), { headers });
  } catch (error) {
    if (error instanceof ChallengeError) return Response.json({ error: error.message }, { status: error.status, headers });
    // Never return credential errors, document contents or answer keys to the browser.
    console.error("Challenge request failed", { code: (error as { code?: unknown })?.code || "unknown" });
    return Response.json({ error: "Não foi possível concluir a operação. Tente novamente em instantes." }, { status: 500, headers });
  }
}
