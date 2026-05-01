/**
 * Land Investor module — for customers like Aaron / BH Land Group who mail
 * land owners offers based on parcel data.
 *
 * Mailer template tokens this module provides:
 *   <<APN>>         — parcel number
 *   <<Acreage>>     — acres, formatted
 *   <<County>>      — property county
 *   <<State>>       — property state
 *   <<Offer>>       — single offer ($) — used when offerType = "single"
 *   <<OfferLow>>    — low end of cash offer ($) — used when offerType = "range"
 *   <<OfferHigh>>   — high end of cash offer ($) — used when offerType = "range"
 *   <<ReferenceID>> — per-piece tracking ref (auto-generated)
 *
 * Order-level config (Order.customFields):
 *   {
 *     columnMap: { apn, acreage, propertyCounty, propertyState, ... },
 *     offerType: "single" | "range" | "none",
 *     offerColumns: { single?: string, low?: string, high?: string },
 *     recipientSource?: string,
 *   }
 *
 * For offerType = "single", the spreadsheet has one offer column.
 * For offerType = "range", two columns (low + high).
 * For offerType = "none", no offer is printed (neutral mailer — just APN/acreage info).
 */

import type { ModuleManifest } from "../registry";
import { LandInvestorOrderFields } from "./OrderFields";

export const landInvestorModule: ModuleManifest = {
  id: "land-investor",
  label: "Land Investor",
  tagline:
    "Parcel-aware mailings: APN, acreage, county, and per-parcel cash offers.",
  mergeVars: [
    { token: "APN", label: "Parcel number (APN)", sample: "043-220-018" },
    { token: "Acreage", label: "Acreage", sample: "12.4" },
    { token: "County", label: "Property county", sample: "Madison" },
    { token: "State", label: "Property state", sample: "NC" },
    { token: "Offer", label: "Cash offer (single)", sample: "$22,000" },
    { token: "OfferLow", label: "Cash offer (low)", sample: "$18,000" },
    { token: "OfferHigh", label: "Cash offer (high)", sample: "$26,000" },
    {
      token: "ReferenceID",
      label: "Per-piece reference ID",
      sample: "BHL-A1B2C3",
    },
  ],
  recipientColumns: [
    {
      field: "apn",
      label: "APN (parcel number)",
      aliases: ["apn", "parcel", "parcel number", "parcel id", "parcel_no"],
      required: true,
      hint: "Assessor's Parcel Number — uniquely identifies the land",
    },
    {
      field: "acreage",
      label: "Acreage",
      aliases: ["acreage", "acres", "lot size", "size_acres"],
      required: true,
    },
    {
      field: "propertyCounty",
      label: "Property county",
      aliases: ["county", "property county", "parcel county"],
      required: true,
      hint: "County the land is in (may differ from owner's mailing county)",
    },
    {
      field: "propertyState",
      label: "Property state",
      aliases: ["property state", "parcel state", "land state"],
      required: true,
    },
  ],
  OrderFields: LandInvestorOrderFields,
};
