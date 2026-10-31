import { challengeRequest } from "@/server/challenge-http";
import { challengeServerConfigured } from "@/server/firebase-admin";
export const runtime = "nodejs";
export async function GET() { return Response.json({ available: challengeServerConfigured() }, { headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: Request) { return challengeRequest(request, "create"); }
