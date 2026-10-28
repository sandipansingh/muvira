# Wink admin and net collections implementation plan

Approved in conversation: follow attached monochrome Wink reference fc6eecab29d604da14816f253ffb0aa0.webp, remove oversized top-level breadcrumbs and top-right presence identity, add real net-after-refund analytics attributed to locally recorded confirmation dates.

1. Reporting: add admin-only dashboard analytics with day/week/month/year ranges in IST; integer paisa; collections minus deduplicated confirmed refunds; independent order counts; zero-filled elapsed buckets; previous comparable period; explicit incomplete-data flags. Add migration 057 with restricted function grants and compatibility with runtime 056. Keep provider mutations untouched.
2. Workspace: monochrome scoped tokens, compact heading without desktop topbar, sidebar collapse/search and bottom account/settings/logout; compact detail breadcrumbs only; shared mobile modal; restyle all existing flows.
3. Overview: performance 2x2 metrics, real SVG net collections chart with accessible data table, recent orders, operational right rail. URL period state and stale-response protection.
4. Verify: meaningful database/API/browser regressions, isolated local database migration/upgrade tests, all admin routes and responsive/keyboard/error states. Required lint:fix, format, build, type-check, test, graphify update; responsive and static UI audits. Read-only final review; local conventional commits only.

Defaults: Week initially; Day=today/hourly, Week=7 dates/daily, Month=30 dates/daily, Year=12 calendar months/monthly. Previous window shifted 1/7/30 days or 12 months, matching elapsed portion. Light-only, Manrope, charcoal primary actions, semantic status colours. No storefront changes, new chart dependency, or hosted migration execution.
