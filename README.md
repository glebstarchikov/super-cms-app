# Plainly

A simple, git-based content editor for static sites — the editing layer for AI- and code-generated websites. Non-technical owners edit content through a friendly interface; every change is committed straight to the site's GitHub repository and goes live on the next rebuild.

Built on [Pages CMS](https://pagescms.org) (MIT), rebranded and localised (Russian UI).

## Stack

Next.js · better-auth (email OTP) · Drizzle ORM + PostgreSQL · a GitHub App · Resend · Vercel.

## How it works

- Editors sign in with **email only** — a 6-digit code, no GitHub account required.
- Each site's editable content model lives in a **`.pages.yml`** at the repo root.
- Images are **downscaled and converted to WebP in the browser** before upload.
- Saving an edit commits to the repo → the static site rebuilds and publishes.

## Local development

Requires PostgreSQL, a GitHub App, and a `.env.local`.

```bash
npm install

# PostgreSQL (Docker):
docker run --name plainly-db \
  -e POSTGRES_USER=plainly -e POSTGRES_PASSWORD=plainly -e POSTGRES_DB=plainly \
  -p 5432:5432 -d postgres:16

# Create .env.local with DATABASE_URL, BETTER_AUTH_SECRET, CRYPTO_KEY
# (see .env.local.example), then create the GitHub App:
npm run setup:github-app -- --base-url http://localhost:3000 --env .env.local

npm run db:migrate
npm run dev
```

Useful `setup:github-app` options: `--owner-type personal|org`, `--org <slug>`, `--app-name "Plainly (local)"`, `--no-open`.

## License

[MIT](LICENSE). The original Pages CMS copyright is retained per the license.
