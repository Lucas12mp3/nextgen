import { challengeRequest } from "@/server/challenge-http";
export const runtime = "nodejs";
export async function GET(request: Request) { return challengeRequest(request, "result"); }
export async function POST(request: Request) { return challengeRequest(request, "submit"); }
