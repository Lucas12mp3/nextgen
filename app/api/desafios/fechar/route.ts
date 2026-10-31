import { challengeRequest } from "@/server/challenge-http";
export const runtime = "nodejs";
export async function POST(request: Request) { return challengeRequest(request, "close"); }
