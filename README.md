# Goimomi

Travel website with a React/Vite frontend and Django REST backend.

## Project layout

- `goimomifrontend/src` — public pages, administration screens and API client.
- `goimomibackend/Holidays` — application models, APIs, tasks and tests.
- `goimomibackend/backend` — Django configuration and isolated test settings.
- `scripts` — development, packaging and deployment tools.
- `output` and `goimomifrontend/output` — ignored local verification artifacts.

## Local development

Install backend dependencies from `goimomibackend/requirements.txt` and frontend dependencies with `npm ci` inside `goimomifrontend`. Configure backend environment variables using `goimomibackend/.env.example`; keep credentials in the ignored `goimomibackend/.env` file.

Start the frontend and Django together from the frontend directory:

```text
cd goimomifrontend
npm run dev
```

The launcher starts Django on port 8000 if it is not already running, then starts Vite on port 5174. Django reloads when backend code changes. `npm run dev:frontend` from the workspace root uses the same launcher. To run the servers separately, use `npm run dev:backend` and `npm run dev:frontend`. Database and external-service configuration are required for the corresponding live features. Without `TRIPJACK_HOTEL_API_KEY`, the hotel country and nationality dropdowns use local records; live TripJack hotel search remains unavailable.

## Checks

```text
npm run lint:frontend
npm run test:frontend
npm run test:backend
npm run test:packaging
npm run build:frontend
```

Backend tests use an isolated SQLite database. With the frontend development server running, execute `npm run test:browser` or `npm run test:browser:flights` inside `goimomifrontend`. Browser checks require Microsoft Edge; flight checks mock supplier responses and do not book tickets.

## Flight integration

See [TripJack setup and limitations](goimomibackend/TRIPJACK.md). The customer flow supports search, filtering and fare review, followed by a travel-team handoff. Live fares require TripJack credentials and server IP whitelisting. Payment and automatic customer ticketing are not implemented.

## Repository maintenance

Keep source, migrations, dependency lockfiles, deployment scripts and actively referenced assets. Generated Python caches, logs and verification output are ignored by Git. Do not delete uploaded media, environment files, database backups or migration history as part of routine cleanup.

Deployment instructions are in [scripts/deployment](scripts/deployment).
