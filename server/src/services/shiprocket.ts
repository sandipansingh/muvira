/**
 * shiprocket.ts — Shiprocket API client.
 *
 * Manages bearer token auth (token is valid ~24 h; cached for 23 h).
 * Exposes trackSingle() and trackBulk() for shipment tracking.
 *
 * Env vars required:
 *   SHIPROCKET_EMAIL    — Shiprocket account email
 *   SHIPROCKET_PASSWORD — Shiprocket account password
 */

import { env } from "../config/env";
import { logger } from "../lib/logger";

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

// ── Token cache ───────────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0; // Unix ms

async function getToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  logger.info("Shiprocket: refreshing bearer token");

  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: env.SHIPROCKET_EMAIL,
      password: env.SHIPROCKET_PASSWORD,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shiprocket auth failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error("Shiprocket auth: no token in response");

  cachedToken = data.token;
  // Cache for 23 hours (Shiprocket tokens expire in 24 h)
  tokenExpiresAt = now + 23 * 60 * 60 * 1000;

  return cachedToken;
}

// ── Tracking ──────────────────────────────────────────────────────────────────

export interface ShiprocketTrackActivity {
  date: string;
  status: string;
  activity: string;
  location: string;
  "sr-status"?: string;
  "sr-status-label"?: string;
}

export interface ShiprocketShipmentTrack {
  id: number;
  awb_code: string;
  courier_company_id: number;
  shipment_id: number | null;
  order_id: number;
  pickup_date: string | null;
  delivered_date: string | null;
  weight: string;
  packages: number;
  current_status: string;
  delivered_to: string;
  destination: string;
  consignee_name: string;
  origin: string;
  courier_name?: string;
  edd?: string | null;
  pod?: string | null;
}

export interface ShiprocketTrackData {
  track_status: number;
  shipment_status: number;
  shipment_track: ShiprocketShipmentTrack[];
  shipment_track_activities: ShiprocketTrackActivity[];
  track_url: string;
  etd?: string;
}

/**
 * Track a single shipment by AWB code.
 */
export async function trackSingle(
  awb: string,
): Promise<{ tracking_data: ShiprocketTrackData }> {
  const token = await getToken();
  const res = await fetch(
    `${SHIPROCKET_BASE}/courier/track/awb/${encodeURIComponent(awb)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shiprocket trackSingle failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<{ tracking_data: ShiprocketTrackData }>;
}

/**
 * Track multiple shipments by AWB codes (batch).
 * Returns a map of awb → { tracking_data }
 */
export async function trackBulk(
  awbs: string[],
): Promise<Record<string, { tracking_data: ShiprocketTrackData }>> {
  if (awbs.length === 0) return {};

  const token = await getToken();
  const res = await fetch(`${SHIPROCKET_BASE}/courier/track/awbs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ awbs }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shiprocket trackBulk failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<
    Record<string, { tracking_data: ShiprocketTrackData }>
  >;
}
