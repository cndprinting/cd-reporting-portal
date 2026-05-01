/**
 * Module registry — persona-specific feature packs.
 *
 * MailerCity supports multiple customer personas (banks, hospitals, land
 * investors, real-estate brokers, etc.). Rather than bloat the core Order
 * flow with every persona's special fields, each persona ships as a
 * "module" — a self-contained bundle of:
 *   - extra recipient fields (stored in MailPiece.customFields JSON)
 *   - extra order-level config (stored in Order.customFields JSON)
 *   - extra UI sections rendered into the Order Create flow
 *   - extra merge variables exposed to the mailer template engine
 *
 * A Company opts into one or more modules via Company.enabledModules.
 * Standard customers (most banks, most generic clients) opt into nothing
 * and see the default order flow. Land/RE customers opt into "land-investor"
 * and see additional sections.
 *
 * To add a new module:
 *   1. Create src/modules/<name>/manifest.ts that exports a ModuleManifest
 *   2. Register it below
 *   3. Toggle enabledModules on the customer's Company record
 */

import type { ComponentType } from "react";
import { landInvestorModule } from "./land-investor/manifest";

export interface ModuleManifest {
  /** Stable id stored in Company.enabledModules — never change once shipped. */
  id: string;
  /** Human-friendly label for admin UI */
  label: string;
  /** One-liner shown in admin module picker */
  tagline: string;
  /**
   * Merge variables this module contributes to MailerTemplate rendering.
   * Each var is read from MailPiece.customFields[key] at merge time.
   * The value the user puts in the template (e.g. <<APN>>) maps to one of these.
   */
  mergeVars: ModuleMergeVar[];
  /**
   * Recipient list columns this module expects to be importable.
   * The import wizard surfaces these as additional mappable fields.
   */
  recipientColumns: ModuleColumn[];
  /**
   * React component rendered inside /orders/new — between standard
   * upload and template steps. Receives the parsed sheet + mapping +
   * customFields setter. Module owns its own UI here.
   */
  OrderFields?: ComponentType<ModuleOrderFieldsProps>;
}

export interface ModuleMergeVar {
  /** Token used in MailerTemplate htmlTemplate, e.g. "APN", "OfferLow" */
  token: string;
  /** Customer-facing label for the template editor */
  label: string;
  /** Optional sample value rendered in the live preview when no real data */
  sample?: string;
}

export interface ModuleColumn {
  /** Field key written into MailPiece.customFields */
  field: string;
  /** Customer-facing label in the import wizard */
  label: string;
  /** Common spreadsheet header aliases for auto-mapping */
  aliases: string[];
  /** Whether this column is required for the module to function */
  required?: boolean;
  /** Free-text hint shown under the field */
  hint?: string;
}

export interface ModuleOrderFieldsProps {
  /** Current order-level customFields value */
  value: Record<string, unknown>;
  /** Setter merges into Order.customFields on submit */
  onChange: (next: Record<string, unknown>) => void;
  /** Row count (for tier preview, etc.) */
  rowCount: number;
  /** Headers from uploaded sheet (so module can offer "use column" pickers) */
  sheetHeaders: string[];
}

const MODULES: Record<string, ModuleManifest> = {
  [landInvestorModule.id]: landInvestorModule,
};

export function getModule(id: string): ModuleManifest | null {
  return MODULES[id] ?? null;
}

export function getEnabledModules(enabledIds: string[]): ModuleManifest[] {
  return enabledIds.map((id) => MODULES[id]).filter(Boolean);
}

export function listAllModules(): ModuleManifest[] {
  return Object.values(MODULES);
}
