/**
 * Microsoft Graph API client (client-credentials flow).
 *
 * Used to read/write SharePoint files for the AccuZIP Mail.dat auto-import
 * pipeline. Authenticates as the registered app (no user context).
 *
 * Requires env:
 *   MS_GRAPH_TENANT_ID      — Azure AD tenant GUID
 *   MS_GRAPH_CLIENT_ID      — App registration's Application (client) ID
 *   MS_GRAPH_CLIENT_SECRET  — App registration's client secret value
 *
 * Required Azure AD permissions on the app (admin-consented):
 *   Sites.ReadWrite.All  (application permission)
 *      — lets the app read+write any SharePoint site in the tenant.
 *      — can be tightened to Sites.Selected later for least-privilege,
 *        but Sites.ReadWrite.All is simplest to start.
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const tenant = process.env.MS_GRAPH_TENANT_ID;
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
  if (!tenant || !clientId || !clientSecret) {
    throw new Error(
      "Microsoft Graph not configured (need MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET)",
    );
  }

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("scope", "https://graph.microsoft.com/.default");
  body.set("grant_type", "client_credentials");

  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph token fetch failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

async function graphFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/** Resolve a SharePoint site by hostname + site path → site ID. */
export async function resolveSiteId(
  hostname: string,
  sitePath: string,
): Promise<string> {
  const path = sitePath.startsWith("/") ? sitePath : `/${sitePath}`;
  const res = await graphFetch(`/sites/${hostname}:${path}`);
  if (!res.ok) {
    throw new Error(`resolveSiteId failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** Get the site's default Documents drive ID. */
export async function getDefaultDriveId(siteId: string): Promise<string> {
  const res = await graphFetch(`/sites/${siteId}/drive`);
  if (!res.ok) {
    throw new Error(`getDefaultDriveId failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

export interface DriveItem {
  id: string;
  name: string;
  size: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  parentReference?: { id: string; path?: string };
  "@microsoft.graph.downloadUrl"?: string;
}

/** List all immediate children of a folder by path (relative to drive root). */
export async function listChildrenByPath(
  driveId: string,
  folderPath: string,
): Promise<DriveItem[]> {
  // Empty path = drive root
  const segment = folderPath
    ? `/root:/${encodeURI(folderPath).replace(/^\//, "")}:/children`
    : "/root/children";
  const res = await graphFetch(`/drives/${driveId}${segment}`);
  if (!res.ok) {
    throw new Error(
      `listChildrenByPath(${folderPath}) failed (${res.status}): ${await res.text()}`,
    );
  }
  const data = (await res.json()) as { value: DriveItem[] };
  return data.value;
}

/** Download a file's binary content by item ID. */
export async function downloadFile(
  driveId: string,
  itemId: string,
): Promise<Buffer> {
  const res = await graphFetch(`/drives/${driveId}/items/${itemId}/content`);
  if (!res.ok) {
    throw new Error(`downloadFile failed (${res.status}): ${await res.text()}`);
  }
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

/** Move an item (used to shift processed files into _processed or _errors). */
export async function moveItem(
  driveId: string,
  itemId: string,
  destinationParentId: string,
  newName?: string,
): Promise<void> {
  const body: Record<string, unknown> = {
    parentReference: { id: destinationParentId },
  };
  if (newName) body.name = newName;
  const res = await graphFetch(`/drives/${driveId}/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`moveItem failed (${res.status}): ${await res.text()}`);
  }
}

/** Upload a small text file (for writing .error.txt logs into _errors). */
export async function uploadSmallFile(
  driveId: string,
  parentId: string,
  filename: string,
  content: string | Buffer,
): Promise<void> {
  const res = await graphFetch(
    `/drives/${driveId}/items/${parentId}:/${encodeURIComponent(filename)}:/content`,
    {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: typeof content === "string" ? content : new Uint8Array(content),
    },
  );
  if (!res.ok) {
    throw new Error(`uploadSmallFile failed (${res.status}): ${await res.text()}`);
  }
}
