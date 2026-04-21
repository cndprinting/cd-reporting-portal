/**
 * File upload endpoint (Vercel Blob backed).
 * POST /api/uploads
 *   - multipart/form-data with field "file"
 *   - returns { url, pathname, size }
 *
 * Admin-only. Used for merge proof PDF uploads, design assets, etc.
 * Requires BLOB_READ_WRITE_TOKEN env (auto-provided when Vercel Blob
 * is enabled on the project).
 */

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "ACCOUNT_MANAGER")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Vercel Blob not enabled on this project. Enable it at https://vercel.com/benjy-waxmans-projects/cd-reporting-portal/stores",
      },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file field required" }, { status: 400 });
  }

  // Max 20MB to protect serverless limits
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "file too large (max 20MB)" }, { status: 413 });
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const pathname = `uploads/${session.id}/${timestamp}-${safeName}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type || undefined,
    addRandomSuffix: false,
  });

  return NextResponse.json({
    url: blob.url,
    pathname: blob.pathname,
    size: file.size,
    contentType: file.type,
  });
}
