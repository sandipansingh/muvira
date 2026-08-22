# Git Commits & Incremental Workflow Guidelines

This file outlines repository requirements for version control, incremental git commits, and grouping logical changes.

---

## Incremental Local Commits

- **Commit Incrementally & Frequently**: Do NOT make a single giant commit at the end of a task or feature. Commit locally as you complete logical sub-steps, milestones, or refactoring phases.
- **Group Similar & Logical Changes**: Group related files, components, or feature edits into distinct, cohesive local commits (e.g., schema/database updates, UI component changes, backend handlers, documentation updates).
- **One Commit Per Issue**: For any single user request or issue fix, all related edits and follow-up tweaks must be combined into a single clean commit. Avoid leaving multiple fragmented commits for the same task; squash or amend iterative tweaks into one commit per issue.

---

## Commit Message Specification

Use the following rule to generate git commit messages:

> **Commit Message Instruction:**
> Generate Git commit messages using the Conventional Commits specification. Use one of: feat, fix, docs, style, refactor, perf, test, build, ci, chore, or revert. Format: `<type>(<optional-scope>): <description>`. Keep the subject under 72 characters, use the imperative mood, do not end the subject with a period, and output only the commit message. Make the subject describe the primary purpose and highest-impact change of the commit from the perspective of the project, prioritizing user-facing functionality, developer-visible capabilities, or architectural improvements over implementation details. If multiple changes are included, choose the most significant one for the subject and summarize supporting changes (such as migrations, refactors, schema updates, dependency changes, tests, or cleanup) in the body. Include a body only when it adds meaningful context.
