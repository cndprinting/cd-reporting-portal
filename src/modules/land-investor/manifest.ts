/**
 * Land Investor module — for customers like Aaron / BH Land Group who mail
 * land owners offers based on parcel data.
 *
 * Mailer template tokens this module provides (see proof from BH Land Group):
 *   <<APN>>         — parcel number
 *   <<Acreage>>     — acres, formatted
 *   <<County>>      — property county
 *   <<State>>       — property state
 *   <<OfferLow>>    — low end of cash offer ($)
 *   <<OfferHigh>>   — high end of cash offer ($)
 *   <<ReferenceID>> — per-piece tracking ref (auto-generated)
 *
 * Recipient list columns expected (mailing address is already covered by
 * the standard fields; these are the property-side fields):
 *   APN, Property County, Property State, Acreage, Assessed Value,
 *   Last Sale Date, Last Sale Price, Equity %, Vacant flag, Heir flag,
 *   Owner-occupied flag, Skip-trace status
 *
 * Order-level config (Order.customFields):
 *   {
 *     offerRules: {
 *       mode: "per-row" | "formula" | "tiered",
 *       perRowLowCol?: string,           // for per-row mode
 *       perRowHighCol?: string,
 *       formula?: { ratePerAcre: number, multiplier: number },
 *       tiers?: { min: number, max: number, low: number, high: number }[],
 *     },
 *     recipientFilters: {
 *       minEquityPct?: number,
 *       vacantOnly?: boolean,
 *       heirProbateOnly?: boolean,
 *       minAcreage?: number,
 *       maxAcreage?: number,
 *       skipTraceVerifiedOnly?: boolean,
 *     },
 *     recipientSource?: string,  // "PropStream", "DataTree", "manual"
 *     mailingAddressColumns: { line1: string, city: string, state: string, zip: string },
 *     propertyAddressColumns?: { line1: string, city: string, state: string, zip: string },
 *   }
 */

import type { ModuleManifest } from "../registry";
import { LandInvestorOrderFields } from "./OrderFields";

export const landInvestorModule: ModuleManifest = {
  id: "land-investor",
  label: "Land Investor",
  tagline:
    "Parcel-aware mailings: APN, acreage, per-parcel cash offers, skip-trace, equity filters.",
  mergeVars: [
    { token: "APN", label: "Parcel number (APN)", sample: "043-220-018" },
    { token: "Acreage", label: "Acreage", sample: "12.4" },
    { token: "County", label: "Property county", sample: "Madison" },
    { token: "State", label: "Property state", sample: "NC" },
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
    {
      field: "propertyAddress",
      label: "Property address (situs)",
      aliases: ["situs address", "property address", "parcel address"],
      hint: "Optional — physical location of the land if it has one",
    },
    {
      field: "assessedValue",
      label: "Assessed value",
      aliases: ["assessed value", "tax value", "assessor value"],
    },
    {
      field: "lastSalePrice",
      label: "Last sale price",
      aliases: ["last sale price", "prior sale", "sale price"],
    },
    {
      field: "lastSaleDate",
      label: "Last sale date",
      aliases: ["last sale date", "sale date", "deed date"],
    },
    {
      field: "equityPct",
      label: "Equity %",
      aliases: ["equity", "equity pct", "equity percent", "equity_%"],
      hint: "Used by recipient filters (e.g. only mail 50%+ equity owners)",
    },
    {
      field: "vacant",
      label: "Vacant land flag",
      aliases: ["vacant", "vacant land", "is_vacant"],
      hint: "Vacant land vs. SFR / improved — drives offer formula",
    },
    {
      field: "heirProbate",
      label: "Heir / probate flag",
      aliases: ["heir", "probate", "inherited", "estate"],
    },
    {
      field: "ownerOccupied",
      label: "Owner-occupied flag",
      aliases: ["owner occupied", "occupancy", "absentee"],
    },
    {
      field: "skipTraceStatus",
      label: "Skip-trace status",
      aliases: ["skip trace", "skip-trace", "trace status", "verified"],
      hint: 'e.g. "verified", "unverified", "bad address"',
    },
    {
      field: "offerLow",
      label: "Per-row offer low ($)",
      aliases: ["offer low", "low offer", "offer_low_$", "min offer"],
      hint: "Optional — only if you've already calculated offers per row",
    },
    {
      field: "offerHigh",
      label: "Per-row offer high ($)",
      aliases: ["offer high", "high offer", "offer_high_$", "max offer"],
    },
  ],
  OrderFields: LandInvestorOrderFields,
};
