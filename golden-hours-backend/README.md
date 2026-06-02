---
title: Golden Hours Backend
emoji: 🏃
colorFrom: yellow
colorTo: gray
sdk: docker
pinned: false
short_description: golden-hours-backend
---

## Authentication setup

The API supports email/password auth and Google OAuth sign-in through Google ID tokens. Passwords are hashed with bcrypt, API access is protected with JWT bearer tokens, and MongoDB stores user profile data plus provider metadata.

### Local setup

```text
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 7860
```

Set these values in `.env`:

```text
MONGODB_URI=<your MongoDB connection string>
MONGODB_DB=golden_hours
JWT_SECRET=<a long random secret>
JWT_EXPIRES_MINUTES=10080
GOOGLE_CLIENT_ID=<Google OAuth web client ID>
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Google OAuth credentials

In Google Cloud Console, create an OAuth 2.0 **Web application** client. Add your frontend origins to **Authorized JavaScript origins**, for example:

```text
http://localhost:5173
https://<your-frontend-domain>
```

The frontend uses the same client ID as `VITE_GOOGLE_CLIENT_ID`. The backend must use that exact client ID as `GOOGLE_CLIENT_ID` so it can verify the Google ID token audience. No client secret is required for this browser ID-token flow.

### Database indexes and migration

There is no separate migration runner in this project. On startup, FastAPI creates these MongoDB indexes automatically:

```text
users.email unique
users.google_sub unique sparse
entries.user_id + entries.date
```

Restart the backend after deployment to apply the new `google_sub` index. Existing password users can still log in normally; if they later use Google with the same verified email, the account is linked by storing `google_sub` and `picture`. If any test data contains `google_sub: null`, remove that field before creating the unique sparse index:

```text
db.users.updateMany({ google_sub: null }, { $unset: { google_sub: "" } })
```

## Hugging Face Space setup

This backend reads configuration from environment variables, so add these as Space secrets in **Settings -> Variables and secrets**:

```text
MONGODB_URI=<your MongoDB Atlas connection string>
MONGODB_DB=golden_hours
JWT_SECRET=<your JWT secret>
JWT_EXPIRES_MINUTES=10080
GOOGLE_CLIENT_ID=<Google OAuth web client ID>
CORS_ORIGINS=https://gopinathv19-golde-hours-front-end.hf.space
```

Use **New secret** for `MONGODB_URI`, `JWT_SECRET`, and `GOOGLE_CLIENT_ID`. The Docker Space starts FastAPI on port `7860`. The health check is available at `/api/health`.
