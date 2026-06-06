/**
 * tracking.ts — Client API service for Shiprocket shipment tracking.
 *
 * All calls go through the server proxy at /api/tracking so that
 * Shiprocket credentials are never exposed on the client side.
 */

import { api } from "./client";
import type { ShiprocketTrackData } from "../../types/order";

interface ServerTrackSingle {
  success: boolean;
  data?: { tracking_data: ShiprocketTrackData };
  error?: { code: string; message: string };
}

interface ServerTrackBulk {
  success: boolean;
  data?: Record<string, { tracking_data: ShiprocketTrackData }>;
  error?: { code: string; message: string };
}

export const trackingApiService = {
  /**
   * Track a single shipment by AWB code.
   * Returns null on failure (non-fatal — UI shows a fallback).
   */
  async trackSingle(awb: string): Promise<ShiprocketTrackData | null> {
    try {
      const res = await api.get<ServerTrackSingle>(
        `/api/tracking/${encodeURIComponent(awb)}`,
      );
      if (res.success && res.data?.tracking_data) {
        return res.data.tracking_data;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Track multiple shipments by AWB codes (batch).
   * Returns a map of awb_code → ShiprocketTrackData.
   * Never throws — returns {} on error.
   */
  async trackBulk(
    awbs: string[],
  ): Promise<Record<string, ShiprocketTrackData>> {
    if (awbs.length === 0) return {};

    try {
      const res = await api.post<ServerTrackBulk>("/api/tracking/bulk", {
        awbs,
      });

      if (!res.success || !res.data) return {};

      const result: Record<string, ShiprocketTrackData> = {};
      for (const [awb, val] of Object.entries(res.data)) {
        if (val?.tracking_data) {
          result[awb] = val.tracking_data;
        }
      }
      return result;
    } catch {
      return {};
    }
  },
};
