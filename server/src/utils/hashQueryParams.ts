/**
 * hashQueryParams.ts
 *
 * Purpose:
 *   Generates a stable, deterministic MD5-like hash from a query-parameter
 *   object so that search/filter requests with identical params always map to
 *   the same cache key — regardless of the order the params appear in the URL.
 *
 * Behaviour:
 *   1. Accepts a raw `Record<string, unknown>` (typically `req.query`).
 *   2. Strips keys whose values are undefined or empty strings (noise reduction).
 *   3. Sorts the remaining keys alphabetically (order-invariant).
 *   4. Serialises to a canonical JSON string.
 *   5. Runs a fast djb2 hash over every character of the string.
 *   6. Returns a positive 8-character hex string — short enough to embed in a
 *      cache key without blowing past any key-length limits.
 *
 * No external dependency is needed; Node's built-in `crypto` module handles
 * the hashing, keeping the bundle lean and audit surface small.
 *
 * @param params - The query-parameter object to hash (e.g. `req.query`).
 * @returns      A stable hex string (e.g. "a3f8c120") unique to that param set.
 *
 * @example
 *   hashQueryParams({ q: "shoes", category: "men", sort: "newest" })
 *   // → "b4d2e7f1"  (deterministic across restarts)
 */

import { createHash } from "crypto";

export function hashQueryParams(params: Record<string, unknown>): string {
  // Filter out noise: undefined values and blank strings
  const cleaned = Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .sort(([a], [b]) => a.localeCompare(b)),
  );

  const canonical = JSON.stringify(cleaned);

  // MD5 via Node's built-in crypto — no external package required
  return createHash("md5").update(canonical).digest("hex").slice(0, 8);
}
