@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **For all design system rules, component patterns, coding conventions, and UI/UX constraints, see [AGENTS.md](./AGENTS.md).** AGENTS.md is the single source of truth for the codebase.

## Claude-Specific Guidelines

### Verification & Quality Assurance

- **Auto-format after code changes**: After writing or modifying any code, you must automatically run both `npm run lint:fix` and `npm run format` before completing the task.
- **Verification Command**: Before completing a task, you must run the build command (`npm run build`) to ensure there are no compilation or typescript errors.

### Subagents & Permissions

- **Delegation**: Use the `research` subagent when you need to perform broad searches or codebase surveys.
- **Permissions**: Request the narrowest scope possible when asking for file read/write permissions.

### Graphify Integration

- **Graph Queries**: If `graphify-out/graph.json` exists, prefer `graphify query "<question>"` or `graphify explain "<concept>"` to fetch contextual subgraphs instead of doing broad grep searches.
- **Graph Updates**: After modifying any code, run `graphify update .` to keep the codebase AST graph in sync.

### Comment Formatting

- **Simple & Meaningful Comments**: All comments in both Next.js and Cloudflare worker codebases must be simple, concise, and meaningful.
- **No Decorative Comments**: Do not write comments with decorative lines, separators, or banners (e.g., `// ---`, `// ===`). Keep them plain.
- **No Git/Commit References**: Do not write comments referencing git commit hashes, restoration status, or historical git details (e.g., `(Restored original style from ...)`).
