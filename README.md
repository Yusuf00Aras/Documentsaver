# Documentsaver

A tool to simplify the handling of documents, mails and several other important files. Upload a picture or a PDF document and it is stored in a database, where an AI assistant can audit the information and give clear, simple answers so you can better understand the contents of your documents.

## Features

- Upload PDF / PNG / JPEG files (10 MiB limit per file)
- Automatic text extraction and chunked vector embeddings (pgvector)
- Retrieval-augmented chat over your own documents (Google Gemini)
- Automatic AI category suggestions and tagging
- Document and folder views with search, sorting and categories
- Per-chat conversation history
- JWT authentication with refresh tokens, plus a guest login

## Tech stack

- **Frontend:** Vue 3 + Vue Router, built with Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL with the [pgvector](https://github.com/pgvector/pgvector) extension
- **AI:** Google Gemini (`@google/generative-ai`) for chat, categorization and embeddings
- **Auth:** JSON Web Tokens (access + refresh), bcrypt password hashing

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- A running [PostgreSQL](https://www.postgresql.org/) instance with the `pgvector` extension available
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

## Getting started

```bash
# 1. Clone the repository
git clone https://github.com/<your-account>/Documentsaver.git
cd Documentsaver

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# then open .env and fill in your own values

# 4. Build the frontend
npm run build

# 5. Start the server
npm start
```

By default the server listens on the port defined by `PORT` (see `.env.example`).

### Development

For a hot-reloading dev setup, run the backend and the Vite dev server in two terminals:

```bash
npm run server   # Express backend with nodemon
npm run dev      # Vite dev server (proxies /api and /storage to the backend)
```

## Environment variables

Copy `.env.example` to `.env` and provide your own values. Never commit your real `.env`.

| Variable | Description |
| --- | --- |
| `PORT` | Port the Express server listens on |
| `NODE_ENV` | `development` or `production` (controls secure cookies) |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | PostgreSQL database name |
| `ACCESS_TOKEN_SECRET` | Secret used to sign short-lived access tokens |
| `REFRESH_TOKEN_SECRET` | Secret used to sign refresh tokens |
| `GEMINI_API_KEY` | Google Gemini API key |
| `STORAGE_PATH` | Directory where uploaded files are stored (e.g. `./uploads`) |

Generate strong secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Database setup

The application expects a PostgreSQL database with the `pgvector` extension enabled:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

The schema uses the following tables: `users`, `categories`, `documents`, `conversations`, `messages` and `embeddings` (the `embeddings` table stores a `vector` column for cosine-distance similarity search). Create these tables before running the app.

## Available scripts

| Script | Description |
| --- | --- |
| `npm start` | Run the production server (`node`) |
| `npm run server` | Run the backend with `nodemon` for development |
| `npm run dev` | Start the Vite dev server with API proxy |
| `npm run build` | Build the frontend into `dist/` |

## Project structure

```
src/
  frontend/        Vue 3 app + Express server entry point
    utils/         Shared UI components and API calls
  modules/
    auth/          Login and guest login
    chat/          Chat environment and conversation storage
    documents/     PDF processing, storage and categories
    embeddings/    Text chunking and vector embeddings
  shared/
    utils/         DB connection, upload config, formatting helpers
deploy/
  nginx/           Example reverse-proxy configuration
```

## Deployment

An example Nginx reverse-proxy configuration is provided in
[deploy/nginx/Documentsaver.conf](deploy/nginx/Documentsaver.conf). Replace the placeholder
domain with your own and run the app behind it (for production, set `NODE_ENV=production`).
