# AGENTS.md

This is the **single source of truth** for how to write code in this repository. It covers the stack, commands, architecture, and coding conventions.

> [!NOTE]
> Detailed guidelines are organized into specific topic files under `.claude/rules/`:
>
> - [Design System](file://./.claude/rules/design_system.md) — typography, colors, spacing, radius, shadows, logo rules.
> - [Component Patterns](file://./.claude/rules/components.md) — server/client split, data fetching, animations, card patterns, component descriptions.
> - [Build, Image & SEO Rules](file://./.claude/rules/build_seo.md) — Next.js SSR, image rules, SEO constraints.
> - [Structure & Types](file://./.claude/rules/structure_types.md) — folder structure, database schema, type definitions.
> - [Code Style & Comments](file://./.claude/rules/code_style.md) — commenting conventions, plain comment rules.
> - [Git & Commit Workflow](file://./.claude/rules/git_commits.md) — incremental commits, grouping logical changes, conventional commit standards.

---

## Version Warning

This project uses Next.js 16 with breaking changes from earlier versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing framework-specific code.

## Tech Stack

- **Next.js 16** (App Router) with React 19, Turbopack enabled
- **Tailwind CSS v4** (`@tailwindcss/postcss` plugin)
- **Prisma v7** with PostgreSQL — ORM for Supabase-hosted database
- **framer-motion** for all animations
- **lucide-react** for icons

## Verified Commands

All commands are run using `npm`:

- `npm run dev` — Start the development server (with Turbopack)
- `npm run build` — Build project (runs prisma generate → migrate deploy → next build)
- `npm run start` — Start production server
- `npm run lint` — Run ESLint check
- `npm run lint:fix` — Automatically fix lint errors
- `npm run format` — Run Prettier format write
- `npm run format:check` — Check Prettier formatting
- `npm run db:reset` — Reset database using migrations
- `npm run db:seed` — Seed the database (runs `npx tsx prisma/seed.ts`)

### Post-Write Quality Gate

After writing or modifying any code, you **must** run the following commands (in this order) before marking any task as complete or creating a commit:

1. `npm run lint:fix` — Auto-fix ESLint errors
2. `npm run format` — Format all files with Prettier
3. `npm run build` — Verify the project still compiles cleanly

This ensures no lint errors, consistent formatting, and no broken builds.

## Core Conventions & Architecture

- **Landing Page + Listings**: Single-page landing site (`src/app/page.tsx`) and package listings (`src/app/packages/page.tsx`).
- **Path Aliases**: Always use `@/*` to map to `src/*` (e.g., `@/components/...`).
- **Currency & Localization**: Currency is always `₹` (Indian Rupee).
- **Client/Server Boundary**: Server pages pass fetched data to client components (`"use client"`) in `src/components/`.

## Subagents & Permissions

- **Delegation**: Use the `research` subagent when you need to perform broad searches or codebase surveys.
- **Permissions**: Request the narrowest scope possible when asking for file read/write permissions.

## Knowledge Base & Graphify Integration

- **Graph Queries**: If `graphify-out/graph.json` exists, prefer `graphify query "<question>"` or `graphify explain "<concept>"` to fetch contextual subgraphs instead of doing broad grep searches.
- **Graph Updates**: After modifying any code, run `graphify update .` to keep the codebase AST graph in sync.

## Iterative Development & Git Commits

- **Do NOT make a single giant commit** at the end of your task.
- **Commit incrementally and automatically** as you complete logical sub-steps or milestones.
- Every git commit message **MUST** follow the Conventional Commits specification.
- Use the following rule to generate git commit messages:
  > **Commit Message Instruction:**
  > Generate Git commit messages using the Conventional Commits specification. Use one of: feat, fix, docs, style, refactor, perf, test, build, ci, chore, or revert. Format: `<type>(<optional-scope>): <description>`. Keep the subject under 72 characters, use the imperative mood, do not end the subject with a period, and output only the commit message. Make the subject describe the primary purpose and highest-impact change of the commit from the perspective of the project, prioritizing user-facing functionality, developer-visible capabilities, or architectural improvements over implementation details. If multiple changes are included, choose the most significant one for the subject and summarize supporting changes (such as migrations, refactors, schema updates, dependency changes, tests, or cleanup) in the body. Include a body only when it adds meaningful context.

## Do Not (Strict Invariants)

- **No local interface declarations**: All domain-wide database model types must be declared in `src/types/` and imported (never duplicated).
- **No root components**: React components must reside in their respective subdirectories inside `src/components/` (never directly in the root of `src/components/`).
- **No `lib/types/`**: All domain-wide types must live in `src/types/` (never `src/lib/types/` or `src/lib/db/`).
- **No hardcoded Hex values**: Always use CSS custom property variables (`var(--color-primary)`, `var(--color-ink)`, etc.) or Tailwind theme tokens from `src/index.css`. Never write raw hex/rgb values directly in JSX or CSS.
- **Orange Accent Limitation**: Primary brand orange (`--brand` / `--color-primary`) is strictly reserved for interactive CTAs, active tab/pill indicators, price numbers, and hover states. It must NEVER be applied to static headings, static labels, or non-interactive icons.
- **High-Contrast Section Summaries**: Overview callouts, section intro descriptions, and summary text blocks must use high-contrast text (`text-neutral-900` or `var(--color-ink)`) instead of muted grey (`text-neutral-500` or `var(--muted)`).
- **Heading Line Height & Letter Spacing**: Heading line heights must be ≥ 1.15 (preventing mobile text collisions); letter-spacing `-0.025em` for headings, `0.05em` (`tracking-wider`) for uppercase badges/metadata, and `0.12em` for section eyebrows.
- **Two-Font System**: Use `Lora` (`--font-display`) for headings and `.font-display`, and `Lato` (`--font-sans`) for body text and general UI controls.
- **No frames/backgrounds on Logo**: Brand logo images must never have a surrounding frame, background box, border, or shadow.
- **Server APIs & Dynamic SSR**: Since Next.js SSR is used, dynamic server-side APIs (`headers()`, `cookies()`, `noStore()`, dynamic runtime options) are fully supported for per-request server rendering and dynamic backend logic.
- **No dev-related scripts in scripts/**: All development-only or utility helper scripts (such as SQL generators, CSV importers, data-wiping scripts) must reside in `dev-scripts/` (which is git-ignored) and never in the `scripts/` folder (which is reserved for package runtime commands and fallback migration hooks).
- **No new pages without sitemap updates**: Whenever a new page route is added under `src/app/`, you **must** also update both `src/app/sitemap.ts` (add the URL entry) and `src/app/sitemap/page.tsx` (add a visible link in the appropriate section). This is a non-negotiable SEO requirement. Refer to [Build, Image & SEO Rules](file://./.claude/rules/build_seo.md) for details.
- **Clean Code Skill**: Always use the `clean-code` skill when writing or modifying any code in this repository.
- **No decorative/excessive or git-reference comments**: Do not use heavy borders, decorative separators, or visual banners in code comments (e.g., `// ── ...`). Keep comments simple, concise, and meaningful. Do not use excessive comments, styling, or references to git commit hashes and restoration status (e.g., `(Restored original style from ...)`). This rule applies strictly to both the Next.js website and Cloudflare workers. Refer to the [Code Style](file://./.claude/rules/code_style.md) guidelines.
- **Universal Breadcrumb Pattern**: All multi-level and sub-pages must use the unified `<Breadcrumbs>` component (`@/components/common/Breadcrumbs`), adhering strictly to the product page style (`ChevronRight` separators, `text-muted` non-active links with `hover:text-primary`, and active items in `text-ink`). Never hand-roll custom breadcrumb markup or use slash (`/`) delimiters.
- **Reusable Dropdown Component**: For interactive sort selectors, category pickers, and custom dropdown menus, use the animated `<Dropdown>` component (`@/components/ui/Dropdown`) powered by `framer-motion` rather than default HTML `<select>` elements or bespoke dropdown state logic.
- **Pill Pagination & Scroll Workaround**: Multi-page item listings (catalog, orders history) must use the pill-shaped `<Pagination>` component (`@/components/common/Pagination`) with first/prev/next/last chevrons and ellipsis windowing. Whenever a page change is triggered, pages must utilize the scroll workaround (`resultsContainerRef` / `shouldScrollRef`) to smoothly scroll the user back to the top of the results listing.
- **No input font size smaller than 16px (1rem) on form controls**: All text inputs (`<input>`, `<textarea>`, `<select>`) must use a font size of at least `16px` (`text-base` in Tailwind) to prevent iOS Safari auto-zooming on focus on mobile devices.
