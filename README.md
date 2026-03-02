# React + Express + PostgreSQL Starter

This project has:
- `frontend/`: React app (Vite)
- `backend/`: Express API with PostgreSQL (`pg`)

## 1) Install dependencies

From project root:

```bash
npm install --prefix backend
npm install --prefix frontend
```

## 2) Configure backend env

Copy `backend/.env.example` to `backend/.env` and update values.

Required:
- `DATABASE_URL` (PostgreSQL connection string)

Example:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/mydb
```

## 3) Run apps

In two terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## API

`POST /ask`

Request body:

```json
{ "question": "total users" }
```

Current supported question patterns:
- `total users` -> `SELECT COUNT(*) FROM users`

You can extend mapping logic in `backend/src/queryMapper.js`.

## Notes

- Backend connects directly to PostgreSQL. DBeaver is optional and only for DB browsing.
- Endpoint is intentionally read-only and only executes predefined SQL.
