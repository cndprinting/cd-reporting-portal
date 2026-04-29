import { NextRequest } from "next/server";
import { MICROSOFT_CONFIG } from "@/lib/services/oauth";
import { handleOAuthCallback } from "@/lib/services/oauth-callback";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleOAuthCallback(req, MICROSOFT_CONFIG);
}
