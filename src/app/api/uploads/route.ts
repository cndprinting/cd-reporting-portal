/**
 * File upload — Vercel Blob CLIENT upload token endpoint.
 *
 * IMPORTANT: files now stream browser → Blob storage directly, bypassing
 * the serverless function. This is required because Vercel serverless
 * functions cap request bodies at ~4.5MB — print-ready PDFs and large
 * recipient lists exceed that and were failing with "Request Entity Too
 * Large" (which surfaced to the client as "Unexpected token 'R'... not
 * valid JSON").
 *
 * This route no longer receives the file. It only:
 *   1. Verifies the user is logged in
 *   2. Issues a short-lived signed upload token (via handleUpload)
 *   3. Constrains content types + max size
 *
 * Client uses upload() from @vercel/blob/client with handleUploadUrl: "/api/uploads".
 */

import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Vercel Blob not enabled. Add a Blob store in Vercel → Storage." },
      { status: 503 },
    );
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        // Session already verified above. Constrain what can be uploaded.
        return {
          allowedContentTypes: [
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/webp",
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
            "application/zip",
            "application/octet-stream",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB — covers print PDFs + big lists
          tokenPayload: JSON.stringify({ userId: session.id }),
        };
      },
      onUploadCompleted: async () => {
        // No-op — the client receives the blob URL directly and PATCHes it
        // onto the order. Hook here later if we want server-side processing.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
