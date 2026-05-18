# Golden Hours

The Time Polisher is a 10,000-hour goal tracker. Users can register, log focused practice time, see today/weekly/monthly comparisons, and enable browser reminders.

## Stack

- Frontend: React + Vite
- Backend: Python + FastAPI
- Database: MongoDB

## Run MongoDB

```bash
docker compose up -d
```

## Run Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

API runs at `http://localhost:8000`.

## Run Frontend

Install Node.js first, then:

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Main Features

- Multiple user login/register
- Fixed 10,000-hour mastery target
- Add daily achievement sessions
- Today, weekly, monthly, and day-to-day comparisons
- Brief report chart
- Motivational quote
- Browser notification permission button
