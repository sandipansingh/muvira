# Code style and comments

- Follow the repository ESLint and Prettier configuration.
- Prefer small functions with one responsibility, early returns, and explicit error paths.
- Keep route handlers thin: validate in schemas, coordinate in controllers, and put business/database behavior in services.
- Use structured Pino logging on the API. Do not log authentication tokens, secrets, raw payment fields, or unnecessary customer data.
- Comments explain constraints or non-obvious intent. Do not add decorative banners, repeated narration, Git hashes, or restoration history.
- Avoid silent catches. A deliberately ignored best-effort failure must be safe, narrowly scoped, and observable elsewhere.
- Name money values with `_paisa`, provider identifiers with their provider prefix, and booleans with `is_`, `has_`, or an equivalent clear predicate.
- Use `unknown` at external boundaries and narrow it before access.
- Do not add raw color literals in JSX or component CSS; use existing CSS variables or Tailwind tokens.
