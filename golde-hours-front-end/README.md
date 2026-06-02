---
title: Golde Hours Front End
emoji: 💻
colorFrom: indigo
colorTo: gray
sdk: docker
pinned: false
short_description: goldenhours-frontend
---

## Authentication setup

The frontend has separate `/login` and `/register` screens, Google sign-in/sign-up buttons, email/password forms, loading states, validation messages, logout, and protected dashboard routing.

### Local setup

```text
npm install
cp .env.example .env
npm run dev
```

Set these values in `.env`:

```text
VITE_API_URL=http://localhost:7860
VITE_GOOGLE_CLIENT_ID=<Google OAuth web client ID>
```

### Google OAuth credentials

Use a Google OAuth 2.0 **Web application** client ID. Add the frontend URL to **Authorized JavaScript origins**:

```text
http://localhost:5173
https://<your-frontend-domain>
```

Use the same client ID in the backend as `GOOGLE_CLIENT_ID`. The frontend receives a Google ID token and sends it to `/api/auth/google`; the backend verifies the token and creates or links the user account.

### Deployment notes

For Hugging Face Spaces or any static deployment, configure runtime/build variables:

```text
VITE_API_URL=https://<your-backend-domain>
VITE_GOOGLE_CLIENT_ID=<Google OAuth web client ID>
```

The app stores the JWT bearer token in local storage to remember the session. Because the API does not use ambient auth cookies, CSRF protection is not required for the current bearer-token flow. Keep all secrets on the backend only; never expose `JWT_SECRET` or MongoDB credentials to the frontend.
