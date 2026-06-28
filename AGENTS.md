# Repository Guidelines

Muvira — full-stack e-commerce platform (client-server monorepo).

## Project Structure & Module Organization

Monorepo with three `package.json` files:

* `/` – workspace orchestration, linting, formatting
* `client/` – React + Vite storefront
* `server/` – Express REST API

Server modules are organized by domain under `server/src/modules/`.

Client components are organized by feature under `client/src/components/`.

Database: Supabase PostgreSQL.

Payments: Razorpay.

Email: Resend.

---

# Knowledge Base (Graphify)

This repository uses **Graphify** as the primary architectural knowledge base.

Before exploring the codebase:

1. Query Graphify.
2. Understand the architecture.
3. Read only the relevant source files.

Never begin by recursively searching the repository unless Graphify cannot answer.

Preferred workflow:

* graphify query "<question>"
* graphify explain "<component>"
* graphify path "<component A>" "<component B>"

Examples:

* graphify query "How does admin authentication work?"
* graphify query "How are orders processed?"
* graphify explain "CouponService"
* graphify path "Checkout" "PaymentService"

Use `GRAPH_REPORT.md` only for high-level architecture.

Use `graph.json` only if Graphify queries cannot answer.

---

# Development Workflow

Before implementing changes:

1. Understand the affected module.
2. Identify dependencies.
3. Explain the implementation plan.
4. Modify the smallest possible set of files.
5. Preserve existing architecture.

Avoid unnecessary refactors.

---

# Coding Rules

* Follow existing project conventions.
* Keep functions focused.
* Reuse existing utilities.
* Avoid duplicate business logic.
* Prefer composition over duplication.
* Keep API validation in Zod.
* Maintain strict TypeScript types.

Never use `any` unless unavoidable.

---

# When Editing Code

Always:

* preserve API compatibility
* preserve database schema unless requested
* update types when changing APIs
* update imports after moving files

If changing multiple modules, explain why.

---

# Before Creating New Code

Search for existing:

* services
* hooks
* utilities
* middleware
* components

Prefer extending existing implementations over creating duplicates.

---

# Testing Checklist

Before finishing:

* project builds successfully
* lint passes
* new TypeScript errors are not introduced
* imports are clean
* no unused variables

---

# Build Commands

npm run dev

npm run build

npm run lint

npm run lint:fix

npm run format

---

# Deployment

Client builds as static assets.

Server compiles to `server/dist`.

Do not modify deployment configuration unless requested.

---

# Git

Make focused commits.

Do not rewrite Git history.

Do not force push.

Do not commit secrets or `.env` files.
