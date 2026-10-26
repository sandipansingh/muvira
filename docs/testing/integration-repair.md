# Integration repair verification

Implemented from baseline `aa4f5f2` on branch `fix/integration-repair`. Deployment is excluded at the user's request. Provider behavior was verified with isolated fixtures; live-provider acceptance transactions were not performed. No demo account or production credentials are needed for these repository checks.

| Area | Implementation and regression coverage |
| --- | --- |
| Shipping and setup | Canonical free standard/express shipping, no fee controls or invented prices, registered pickup setup, atomic partial settings writes, separate commerce readiness, ₹1 quote minimum and retained payment snapshots. |
| Customer flows | Transactional IndexedDB cart transfers with stable per-account operation IDs, server deduplication, simultaneous tabs, lost responses, unavailable items, empty persistence, hydration/error states and independent product sections. |
| Refunds and cancellation | Durable admin intents, full/partial/remaining balances, server reservations, guarded cancellation follow-up, pending provider outcomes and prepared-operation crash recovery. |
| Workers | Due-time watch selection, 21-watch fairness, capped backoff, lease fencing, startup recovery, partial-start cleanup and continued failed-delivery/RTO polling. |
| Fulfillment | Stored billing/shipping/GST mapping, weight precedence, postcode and gram conversion, normalized pickup responses, business-success validation, document URL checks, carrier selection and resumable confirmed steps. |
| Catalog and media | Product/category/content editors, explicit image removal, order/primary/alt controls, pending attachment reconciliation, preservation after ambiguous writes/refresh failures, no stale stock writes from description edits, no-store stock reads and 8 MiB limits. |
| Reporting | Server-side failure filtering, independent URL pagination/totals, worker and recovery diagnostics, SQL aggregates above 1,000 rows, Kolkata day boundaries independent of database DST timezone, and transactional five-category navigation cap. |
| Hosting and CI | Script-relative static roots, missing-build failure, real asset 404s, SPA fallback, www308 configuration, mandatory isolated integration suites and 048–052 compatibility/rollback checks. |

Append-only migrations 049–052 contain explicit service-role grants and safe search paths. Local verification includes clean replay, upgrade from 025, intermediate upgrades from 048, RLS/grant checks and unchanged existing order/payment/provider-operation snapshots.

Repository checks run in the required order: `lint:fix`, `format`, `build`, `type-check`, `test`, then `graphify update .`. Database and mounted browser suites supply behavioral checks beyond compilation. The graph update succeeds; SQL graph extraction is unavailable because the optional `tree_sitter_sql` dependency is absent. SQL execution and security checks run against local PostgreSQL independently of that graph.

See [local integration instructions](local-integration.md) for reproducible commands, release profiles and future deployment gates. Browser tests use mocked Auth/API boundaries; authenticated API tests use real isolated Supabase identities. Neither is represented as a live Razorpay, Shiprocket or Resend acceptance run.
