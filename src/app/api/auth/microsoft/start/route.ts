import { NextRequest, NextResponse } from "next/server";
import { MICROSOFT_CONFIG, buildAuthorizeUrl, startState } from "@/lib/services/oauth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const next = new URL(req.url).searchParams.get("next") ?? "/dashboard";
  const state = await startState("microsoft", next);
  try {
    const url = buildAuthorizeUrl(MICROSOFT_CONFIG, state);
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent((e as Error).message)}`,
        req.url,
      ),
    );
  }
}
