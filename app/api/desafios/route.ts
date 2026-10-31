import { challengeRequest } from "@/server/challenge-http";
import { challengeAvailability } from "@/server/firebase-admin";
export const runtime = "nodejs";
export async function GET() { return Response.json(challengeAvailability(), { headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: Request) { return challengeRequest(request, "create"); }
