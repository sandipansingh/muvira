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
- **No hardcoded Hex values**: Always use `@theme` Tailwind CSS v4 variables from `globals.css`.
- **No frames/backgrounds on Logo**: Brand logo images must never have a surrounding frame, background box, border, or shadow.
- **Server APIs & Dynamic SSR**: Since Next.js SSR is used, dynamic server-side APIs (`headers()`, `cookies()`, `noStore()`, dynamic runtime options) are fully supported for per-request server rendering and dynamic backend logic.
- **No dev-related scripts in scripts/**: All development-only or utility helper scripts (such as SQL generators, CSV importers, data-wiping scripts) must reside in `dev-scripts/` (which is git-ignored) and never in the `scripts/` folder (which is reserved for package runtime commands and fallback migration hooks).
- **No new pages without sitemap updates**: Whenever a new page route is added under `src/app/`, you **must** also update both `src/app/sitemap.ts` (add the URL entry) and `src/app/sitemap/page.tsx` (add a visible link in the appropriate section). This is a non-negotiable SEO requirement. Refer to [Build, Image & SEO Rules](file://./.claude/rules/build_seo.md) for details.
- **Clean Code Skill**: Always use the `clean-code` skill when writing or modifying any code in this repository.
- **No decorative/excessive or git-reference comments**: Do not use heavy borders, decorative separators, or visual banners in code comments (e.g., `// ── ...`). Keep comments simple, concise, and meaningful. Do not use excessive comments, styling, or references to git commit hashes and restoration status (e.g., `(Restored original style from ...)`). This rule applies strictly to both the Next.js website and Cloudflare workers. Refer to the [Code Style](file://./.claude/rules/code_style.md) guidelines.
- **No single giant commit**: Do NOT make a single giant commit at the end of a task. Commit incrementally and locally as logical sub-steps or milestones are completed, grouping similar changes together following Conventional Commits. Refer to [Git & Commit Workflow](file://./.claude/rules/git_commits.md) for details.
- **One Commit Per Issue**: For any single user request, bug fix, or feature task, all related edits and follow-up adjustments must be combined into a single cohesive commit. Do NOT leave multiple fragmented commits for the same issue—amend or squash iterative tweaks into one commit per issue.
- **No input font size smaller than 16px (1rem) on form controls**: All text inputs (`<input>`, `<textarea>`, `<select>`) must use a font size of at least `16px` (`text-base` in Tailwind) to prevent iOS Safari auto-zooming on focus on mobile devices.
