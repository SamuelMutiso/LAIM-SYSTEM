# LAIM Office

Private office system for Lord's Altar Ministries International: LAIM HQ, Korrompoi, Milimani, Matuu and Noonkopir.

- `frontend/` React 18, Vite, Redux Toolkit, Tailwind. Deployed on Vercel.
- `backend/` Flask, SQLAlchemy, PostgreSQL, JWT. Deployed on Render.

## Who sees what

| Role | Sees | Can change |
|---|---|---|
| Bishop | All branches | Nothing (view only) |
| Branch pastor | Own branch | Nothing (view only) |
| Branch secretary | Own branch | All records for own branch |
| Home church leader | Own home church | Thursday reports |

## Run locally

```bash
cd backend
cp .env.example .env
pipenv install --dev
pipenv run flask db upgrade
pipenv run flask bootstrap
pipenv run flask run
```

```bash
cd frontend
npm install
npm run dev
```

## Deploy

1. Render: New, Blueprint, pick this repo. It reads `render.yaml` and creates the API, the database and the rate-limit store.
2. Vercel: New Project, pick this repo, Root Directory `frontend`, add `VITE_API_URL` set to the Render API address.
3. Render: set `CORS_ORIGINS` on `laim-office-api` to the Vercel address.
4. Render Shell on `laim-office-api`: `flask bootstrap` once, and save the passwords it prints.

Both deploy automatically from `main`.

## Office commands (Render Shell or local)

| Command | Does |
|---|---|
| `flask bootstrap` | Branches, Bishop contact, Bishop and HQ secretary logins, 5 HQ home churches with leader logins |
| `flask create-user` | Add a login |
| `flask list-users` | List all logins |
| `flask reset-password EMAIL` | New password, also unlocks |
| `flask unlock EMAIL` | Unlock after 5 wrong passwords |
| `flask add-cell NAME AREA -b BRANCH_ID` | Add a home church |

## Tests

```bash
cd backend && pipenv run pytest
cd frontend && npm run lint
```
