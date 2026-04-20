/**
 * API key helpers for customer pull API.
 *
 * Flow:
 *   1. Admin creates a key for a Company → we generate a random key, hash it,
 *      store the hash + prefix, return the raw key ONCE.
 *   2. Customer calls /api/v1/... with `Authorization: Bearer cdk_live_xxx...`
 *   3. verifyApiKey() looks up by prefix, compares hash, returns the Company.
 */

import crypto from "node:crypto";
import prisma from "@/lib/prisma";

const KEY_PREFIX_LEN = 16; // "cdk_live_" + 8 random chars shown

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(24).toString("hex"); // 48 chars
  const raw = `cdk_live_${random}`;
  const prefix = raw.slice(0, KEY_PREFIX_LEN);
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, prefix, hash };
}

/** Parse Authorization header, find the key, verify hash, return the company. */
export async function verifyApiKey(authHeader: string | null): Promise<
  | { ok: true; companyId: string; scopes: string[]; keyId: string }
  | { ok: false; reason: string }
> {
  if (!prisma) return { ok: false, reason: "db unavailable" };
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, reason: "missing bearer token" };
  }
  const raw = authHeader.slice("Bearer ".length).trim();
  if (!raw.startsWith("cdk_live_")) return { ok: false, reason: "bad key format" };

  const prefix = raw.slice(0, KEY_PREFIX_LEN);
  const candidates = await prisma.apiKey.findMany({
    where: { keyPrefix: prefix, revokedAt: null },
  });

  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const match = candidates.find((k) => k.keyHash === hash);
  if (!match) return { ok: false, reason: "invalid key" };
  if (match.expiresAt && match.expiresAt < new Date()) {
    return { ok: false, reason: "key expired" };
  }

  // Touch lastUsedAt (fire-and-forget)
  prisma.apiKey
    .update({ where: { id: match.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    ok: true,
    companyId: match.companyId,
    scopes: match.scopes.split(/\s+/).filter(Boolean),
    keyId: match.id,
  };
}

export function requireScope(scopes: string[], required: string): boolean {
  return scopes.includes(required) || scopes.includes("admin");
}
