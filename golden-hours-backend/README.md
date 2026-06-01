---
title: Golden Hours Backend
emoji: 🏃
colorFrom: yellow
colorTo: gray
sdk: docker
pinned: false
short_description: golden-hours-backend
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference

## Hugging Face Space setup

This backend reads configuration from environment variables, so add these as
Space secrets in **Settings -> Variables and secrets**:

```text
MONGODB_URI=<your MongoDB Atlas connection string>
MONGODB_DB=golden_hours
JWT_SECRET=<your JWT secret>
JWT_EXPIRES_MINUTES=10080
CORS_ORIGINS=https://gopinathv19-golde-hours-front-end.hf.space
```

Use **New secret** for `MONGODB_URI` and `JWT_SECRET`. The other values can also
be secrets, or plain variables if you prefer.

The Docker Space starts FastAPI on port `7860`. After deployment, the health
check should be available at:

```text
https://<your-backend-space-subdomain>.hf.space/api/health
```

Point the frontend API/base URL to the backend Space URL, without a trailing
slash unless your frontend specifically requires it.
