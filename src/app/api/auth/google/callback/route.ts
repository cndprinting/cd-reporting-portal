import { NextRequest } from "next/server";
import { GOOGLE_CONFIG } from "@/lib/services/oauth";
import { handleOAuthCallback } from "@/lib/services/oauth-callback";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleOAuthCallback(req, GOOGLE_CONFIG);
}
