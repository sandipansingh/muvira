# Muvira

Modern full-stack e-commerce platform.

## Run locally

### Prerequisites
- Node.js ≥ 20

### 1. Install dependencies

```bash
npm install
```
*(This automatically runs `postinstall` to install dependencies in both `client` and `server`)*


### 2. Setup environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` and `client/.env` with your:
- Supabase URL + keys
- Razorpay keys
- Allowed origins

### 3. Start development

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

### Other commands

```bash
npm run build          # build both
npm run lint
npm run format
```

Create a Supabase project and run the migrations in `server/supabase/migrations/` before first use.
