"use client";

/**
 * Client-side file upload via Vercel Blob. Streams the file directly from
 * the browser to Blob storage (bypassing the 4.5MB serverless body limit),
 * using a signed token issued by /api/uploads.
 *
 * Usage:
 *   const { url } = await uploadFile(file);
 */

import { upload } from "@vercel/blob/client";

export interface UploadResult {
  url: string;
  pathname: string;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const pathname = `uploads/${Date.now()}-${safeName}`;

  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/uploads",
    contentType: file.type || undefined,
  });

  return { url: blob.url, pathname: blob.pathname };
}
