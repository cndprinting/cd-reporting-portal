/**
 * C&D Printing USPS identifiers.
 *
 * CRID and MID are not strictly secret (they appear on USPS mailing statements)
 * but we still load them from env vars so we can point different environments
 * at test vs. production, and so rotation doesn't require a code change.
 *
 * Defaults here are C&D Printing production values — safe to fall back to them.
 */

export const USPS_CRID = process.env.USPS_CRID ?? "2504758";
export const USPS_MID = process.env.IV_MTR_MID ?? "901052658";

/** All MIDs C&D uses (we currently have one, but leave room for growth). */
export const USPS_ALL_MIDS = (process.env.USPS_ALL_MIDS ?? USPS_MID)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export const USPS_MAILER_NAME = "C&D Printing";
