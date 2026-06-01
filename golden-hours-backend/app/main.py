from collections import defaultdict
from datetime import date, timedelta

from bson import ObjectId
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from .auth import create_access_token, get_current_user, hash_password, verify_password
from .config import get_settings
from .database import close_mongo_connection, connect_to_mongo, get_database
from .models import EntryCreate, EntryOut, EntryUpdate, SummaryOut, TokenOut, UserCreate, UserLogin
from .utils import QUOTES, entry_to_out, month_key, start_of_week, user_to_out, utc_now

settings = get_settings()
app = FastAPI(title="Golden Hours API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def safe_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=404, detail="Entry not found")
    return ObjectId(value)


@app.on_event("startup")
async def startup() -> None:
    await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown() -> None:
    await close_mongo_connection()


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "service": "golden-hours"}


@app.post("/api/auth/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate) -> dict:
    db = get_database()
    user = {
        "name": payload.name,
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "total_goal_hours": 10000,
        "created_at": utc_now(),
    }
    try:
        result = await db.users.insert_one(user)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=409, detail="Email already registered") from exc
    user["_id"] = result.inserted_id
    return {"access_token": create_access_token(str(result.inserted_id)), "user": user_to_out(user)}


@app.post("/api/auth/login", response_model=TokenOut)
async def login(payload: UserLogin) -> dict:
    db = get_database()
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"access_token": create_access_token(str(user["_id"])), "user": user_to_out(user)}


@app.get("/api/me", response_model=dict)
async def me(user: dict = Depends(get_current_user)) -> dict:
    return user_to_out(user)


@app.post("/api/entries", response_model=EntryOut, status_code=status.HTTP_201_CREATED)
async def create_entry(payload: EntryCreate, user: dict = Depends(get_current_user)) -> dict:
    db = get_database()
    entry = {
        "user_id": user["_id"],
        "title": payload.title,
        "category": payload.category,
        "minutes": payload.minutes,
        "date": payload.date.isoformat(),
        "notes": payload.notes,
        "created_at": utc_now(),
    }
    result = await db.entries.insert_one(entry)
    entry["_id"] = result.inserted_id
    return entry_to_out(entry)


@app.get("/api/entries", response_model=list[EntryOut])
async def list_entries(
    limit: int = Query(default=50, ge=1, le=200),
    user: dict = Depends(get_current_user),
) -> list[dict]:
    db = get_database()
    cursor = db.entries.find({"user_id": user["_id"]}).sort("date", -1).limit(limit)
    return [entry_to_out(entry) async for entry in cursor]


@app.patch("/api/entries/{entry_id}", response_model=EntryOut)
async def update_entry(entry_id: str, payload: EntryUpdate, user: dict = Depends(get_current_user)) -> dict:
    db = get_database()
    changes = {key: value for key, value in payload.model_dump().items() if value is not None}
    if "date" in changes:
        changes["date"] = changes["date"].isoformat()
    if not changes:
        raise HTTPException(status_code=400, detail="No changes provided")
    updated = await db.entries.find_one_and_update(
        {"_id": safe_object_id(entry_id), "user_id": user["_id"]},
        {"$set": changes},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry_to_out(updated)


@app.delete("/api/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(entry_id: str, user: dict = Depends(get_current_user)) -> None:
    db = get_database()
    result = await db.entries.delete_one({"_id": safe_object_id(entry_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")


@app.get("/api/summary", response_model=SummaryOut)
async def summary(user: dict = Depends(get_current_user)) -> dict:
    db = get_database()
    entries = [entry async for entry in db.entries.find({"user_id": user["_id"]})]
    today = date.today()
    week_start = start_of_week(today)
    month_start = today.replace(day=1)

    total_minutes = sum(entry["minutes"] for entry in entries)
    dated_entries = [{**entry, "parsed_date": date.fromisoformat(entry["date"])} for entry in entries]
    today_minutes = sum(entry["minutes"] for entry in dated_entries if entry["parsed_date"] == today)
    week_minutes = sum(entry["minutes"] for entry in dated_entries if entry["parsed_date"] >= week_start)
    month_minutes = sum(entry["minutes"] for entry in dated_entries if entry["parsed_date"] >= month_start)

    daily = defaultdict(int)
    weekly = defaultdict(int)
    monthly = defaultdict(int)
    for entry in dated_entries:
        entry_date = entry["parsed_date"]
        daily[entry_date.isoformat()] += entry["minutes"]
        weekly[start_of_week(entry_date).isoformat()] += entry["minutes"]
        monthly[month_key(entry_date)] += entry["minutes"]

    goal = user.get("total_goal_hours", 10000)
    total_hours = round(total_minutes / 60, 2)
    quote = QUOTES[int(total_minutes / 60) % len(QUOTES)]
    last_14_days = [today - timedelta(days=offset) for offset in range(13, -1, -1)]

    return {
        "total_hours": total_hours,
        "remaining_hours": round(max(goal - total_hours, 0), 2),
        "progress_percent": round(min((total_hours / goal) * 100, 100), 2),
        "today_hours": round(today_minutes / 60, 2),
        "week_hours": round(week_minutes / 60, 2),
        "month_hours": round(month_minutes / 60, 2),
        "day_to_day": [{"label": item.isoformat(), "hours": round(daily[item.isoformat()] / 60, 2)} for item in last_14_days],
        "weekly": [{"label": key, "hours": round(value / 60, 2)} for key, value in sorted(weekly.items())[-8:]],
        "monthly": [{"label": key, "hours": round(value / 60, 2)} for key, value in sorted(monthly.items())[-12:]],
        "quote": quote,
    }
