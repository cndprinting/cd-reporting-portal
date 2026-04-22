"use client";

/**
 * Admin — Mailer Template Library
 *
 * Manage the HTML templates customers pick from in the self-service order
 * flow. Admin can:
 *   - See all active templates with live preview (sample merge data)
 *   - Create a new template (name, size, category, price, min qty,
 *     variables, HTML body)
 *   - Edit or soft-delete existing templates
 *
 * Templates use {{variable}} placeholders that get filled from the customer's
 * uploaded spreadsheet at merge time.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Layers,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Eye,
  Copy,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: string;
  name: string;
  category: string;
  size: string;
  thumbnailUrl: string | null;
  htmlTemplate: string;
  variables: string;
  pricePerPiece: number;
  minQuantity: number;
  isActive?: boolean;
  createdAt?: string;
}

const SAMPLE_DATA: Record<string, string> = {
  firstName: "Sarah",
  lastName: "Johnson",
  address1: "1247 Ocean Ave",
  city: "Long Branch",
  state: "NJ",
  zip5: "07740",
  offer: "$50 off your first service",
  companyName: "C&D Printing",
};

function renderTemplate(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_m, key) => SAMPLE_DATA[key] ?? `{{${key}}}`);
}

const EMPTY: Template = {
  id: "",
  name: "",
  category: "postcard",
  size: "6x9",
  thumbnailUrl: null,
  htmlTemplate:
    '<div style="width:100%;height:100%;background:#0ea5e9;color:#fff;padding:32px;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;border-radius:12px;">\n  <div>\n    <div style="font-size:32px;font-weight:800;">Hi {{firstName}}</div>\n  </div>\n  <div>{{offer}}</div>\n</div>',
  variables: "firstName,address1,city,state,zip5,offer",
  pricePerPiece: 0.85,
  minQuantity: 500,
};

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const isSeed = (id: string) => id.startsWith("seed-");

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.htmlTemplate.trim()) {
      setMsg({ ok: false, text: "Name and HTML are required" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const isNew = !editing.id || isSeed(editing.id);
      const url = isNew ? "/api/templates" : `/api/templates/${editing.id}`;
      const method = isNew ? "POST" : "PATCH";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg({ ok: false, text: d.error ?? "Save failed" });
        return;
      }
      setMsg({ ok: true, text: isNew ? "Template created" : "Template updated" });
      setEditing(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (tpl: Template) => {
    if (isSeed(tpl.id)) {
      setMsg({
        ok: false,
        text: "Seed templates can't be deleted — duplicate one to customize instead",
      });
      return;
    }
    if (!confirm(`Remove "${tpl.name}"? Existing orders keep their copy.`)) return;
    const r = await fetch(`/api/templates/${tpl.id}`, { method: "DELETE" });
    if (r.ok) {
      setMsg({ ok: true, text: "Template removed" });
      load();
    } else {
      const d = await r.json();
      setMsg({ ok: false, text: d.error ?? "Delete failed" });
    }
  };

  const duplicate = (tpl: Template) => {
    setEditing({
      ...tpl,
      id: "",
      name: `${tpl.name} (copy)`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mailer Templates</h1>
            <p className="text-sm text-gray-500">
              Designs customers pick from when creating a self-service order
            </p>
          </div>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })} className="bg-brand-600 hover:bg-brand-700">
          <Plus className="h-4 w-4 mr-1" /> New Template
        </Button>
      </div>

      {msg && (
        <div
          className={`rounded-lg p-3 text-sm border ${
            msg.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {msg.text}
        </div>
      )}

      {editing && <TemplateEditor value={editing} onChange={setEditing} onSave={save} onCancel={() => setEditing(null)} busy={busy} />}

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="overflow-hidden">
              <div className="aspect-[6/9] bg-gray-100 relative">
                <div
                  className="absolute inset-3 overflow-hidden rounded-lg shadow-sm"
                  dangerouslySetInnerHTML={{ __html: renderTemplate(tpl.htmlTemplate) }}
                />
              </div>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-gray-900 text-sm">{tpl.name}</div>
                  {isSeed(tpl.id) && (
                    <Badge variant="outline" className="text-[10px]">Built-in</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{tpl.size}</span>
                  <span>·</span>
                  <span className="capitalize">{tpl.category}</span>
                  <span>·</span>
                  <span>${tpl.pricePerPiece.toFixed(2)}/pc</span>
                  <span>·</span>
                  <span>min {tpl.minQuantity}</span>
                </div>
                <div className="text-[11px] text-gray-400 font-mono truncate">
                  {tpl.variables}
                </div>
                <div className="flex gap-1 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(tpl)}
                    disabled={isSeed(tpl.id)}
                    title={isSeed(tpl.id) ? "Duplicate to edit seed templates" : "Edit"}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicate(tpl)}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 ml-auto"
                    onClick={() => remove(tpl)}
                    disabled={isSeed(tpl.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  value,
  onChange,
  onSave,
  onCancel,
  busy,
}: {
  value: Template;
  onChange: (t: Template) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const preview = useMemo(() => renderTemplate(value.htmlTemplate), [value.htmlTemplate]);
  const isNew = !value.id || value.id.startsWith("seed-");
  const field = <K extends keyof Template>(k: K, v: Template[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <Card className="border-brand-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{isNew ? "New Template" : `Edit — ${value.name}`}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button onClick={onSave} disabled={busy} className="bg-brand-600 hover:bg-brand-700">
            <Save className="h-4 w-4 mr-1" /> {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Name</label>
              <Input value={value.name} onChange={(e) => field("name", e.target.value)} placeholder="Real Estate — Cash Offer" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Category</label>
                <select
                  className="w-full h-9 rounded-md border border-gray-300 px-2 text-sm"
                  value={value.category}
                  onChange={(e) => field("category", e.target.value)}
                >
                  <option value="postcard">Postcard</option>
                  <option value="letter">Letter</option>
                  <option value="flat">Flat</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Size</label>
                <select
                  className="w-full h-9 rounded-md border border-gray-300 px-2 text-sm"
                  value={value.size}
                  onChange={(e) => field("size", e.target.value)}
                >
                  <option value="4x6">4×6</option>
                  <option value="6x9">6×9</option>
                  <option value="6x11">6×11</option>
                  <option value="8.5x11">8.5×11</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Price / pc</label>
                <Input
                  type="number"
                  step="0.01"
                  value={value.pricePerPiece}
                  onChange={(e) => field("pricePerPiece", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Min Quantity</label>
                <Input
                  type="number"
                  value={value.minQuantity}
                  onChange={(e) => field("minQuantity", parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Thumbnail URL (optional)</label>
                <Input
                  value={value.thumbnailUrl ?? ""}
                  onChange={(e) => field("thumbnailUrl", e.target.value || null)}
                  placeholder="https://…"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Variables (comma-separated)
              </label>
              <Input
                value={value.variables}
                onChange={(e) => field("variables", e.target.value)}
                placeholder="firstName,address1,city,state,zip5,offer"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                The customer's spreadsheet must supply these column names.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                HTML Template — use <code className="bg-gray-100 px-1 rounded">{"{{variableName}}"}</code>
              </label>
              <textarea
                className="w-full h-64 font-mono text-xs border border-gray-300 rounded-md p-2"
                value={value.htmlTemplate}
                onChange={(e) => field("htmlTemplate", e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Eye className="h-3.5 w-3.5" /> Live preview with sample data
            </div>
            <div className="aspect-[6/9] bg-gray-100 rounded-lg p-3">
              <div
                className="w-full h-full overflow-hidden rounded-lg shadow-sm"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Sample: firstName=Sarah, address1=1247 Ocean Ave, city=Long Branch,
              offer="$50 off your first service"
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
