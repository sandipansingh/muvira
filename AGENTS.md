# AGENTS.md

This file is the source of truth for changes in this repository. More focused guidance lives under `.claude/rules/`.

## Stack

- Client: Vite 8, React 19, TypeScript 6, React Router 7, Tailwind CSS 3, framer-motion, and lucide-react
- API: Express 4, TypeScript 5, Zod, and structured Pino logging
- Data: Supabase PostgreSQL migrations, Auth, Storage, and Row Level Security
- Providers: Razorpay, Shiprocket, and Resend

There is no Next.js, Prisma, or server-side React rendering in this repository.

## Commands

Run commands from the repository root unless noted otherwise.

- `pnpm run dev` — run the Vite client and Express API
- `pnpm run lint` / `pnpm run lint:fix` — check or fix ESLint findings
- `pnpm run format:check` / `pnpm run format` — check or write Prettier formatting
- `pnpm run type-check` — type-check client and API
- `pnpm run build` — build client and API
- `pnpm test` — build and run regression tests
- `pnpm run db:start` / `pnpm run db:stop` — manage local Supabase
- `pnpm run db:reset` — replay all migrations against local Supabase without seed data
- `pnpm run db:migrate` — push migrations to the explicitly linked Supabase project

After modifying code, run these commands in order before completing a task or committing a milestone:

1. `pnpm run lint:fix`
2. `pnpm run format`
3. `pnpm run build`
4. `pnpm run type-check`
5. `pnpm test`
6. `graphify update .`

## Architecture

- `client/src/pages/` contains route pages; admin pages live in `client/src/pages/admin/`.
- `client/src/components/` is organized by feature (`admin`, `auth`, `cart`, `catalog`, `checkout`, `common`, `home`, `layout`, `product`, and `ui`).
- `client/src/lib/services/` owns API calls. Components must not invent fallback commercial data after an API failure.
- `client/src/types/` contains cross-feature contracts; feature adapter types currently live in `client/src/lib/types/`.
- `server/src/modules/` contains route, schema, controller, and service layers by domain.
- `server/src/services/` contains background workers and provider-facing shared services.
- `server/src/types/` contains API-wide and database-facing types.
- `supabase/migrations/` is the database source of truth.

The client uses Supabase directly only for Auth and approved Storage actions. Commerce, customer-data mutation, and administration must go through the Express API. Backend authorization is mandatory even when RLS also protects the table.

All money is integer paisa at API and database boundaries. UI conversion to rupees happens only for display or explicit input conversion.

## Database and security

- Never edit a checked-in migration. Add a new numbered migration.
- Security-definer functions must set a safe search path, validate every input, revoke execution from `PUBLIC`, `anon`, and `authenticated`, and grant only the intended role.
- Treat RLS as a public security boundary because the anonymous Supabase key is present in the browser.
- Use service-role access only inside the API and workers. Never log or return secrets.
- Payment and webhook changes require signature, amount, currency, state, ownership, idempotency, and replay tests.
- Do not collect card, CVV, UPI, wallet, or bank credentials in Muvira forms or send them to the API.
- Provider success followed by local persistence failure must create a visible reconciliation or retry record.

## Code and UI conventions

- Use the existing relative-import convention within each package.
- Keep reusable React components in a relevant `client/src/components/<domain>/` directory.
- Keep domain-wide interfaces in the existing shared type locations instead of duplicating them in components.
- Use `₹` and Indian localization for customer-visible currency.
- Use existing CSS variables and Tailwind tokens; do not add raw colors to JSX or component CSS.
- Reserve the primary brand color for interactive actions, selected controls, prices, and hover states.
- Headings use Raleway (`font-display`); body and controls use Lato (`font-sans`).
- Form controls must render at 16px or larger to avoid iOS focus zoom.
- Use `Breadcrumbs`, `Dropdown`, and `Pagination` rather than hand-rolled equivalents. Paginated screens retain the existing scroll-to-results behavior.
- Logo images must not be wrapped in decorative frames, borders, backgrounds, or shadows.
- Keep comments concise and factual. Do not add decorative separators or Git-history commentary.
- Use framer-motion for stateful UI motion; the existing CSS marquee is the only established keyframe exception.

## Optional features

Wishlist, newsletter subscriptions, customer returns, SMS, push notifications, and Apple OAuth are not currently supported. Keep their controls and claims absent unless a product decision explicitly adds the feature with real persistence/provider behavior.

## Repository workflow

- Preserve unrelated work in a dirty tree and stage only files belonging to the current milestone.
- Commit logical milestones incrementally with Conventional Commit messages.
- Development-only data tools belong in git-ignored `dev-scripts/`; production runtime helpers belong in `scripts/` only when required at runtime.
- If `graphify-out/graph.json` exists, prefer focused `graphify query`/`graphify explain` calls for broad architecture questions and run `graphify update .` after code changes.
- Use the `research` subagent for broad repository surveys when subagents are available.
