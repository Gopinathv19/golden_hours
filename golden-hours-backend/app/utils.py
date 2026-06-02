from datetime import UTC, date, datetime, timedelta

from bson import ObjectId


QUOTES = [
    "Small hours, repeated with care, become a craft.",
    "The polish is hidden in today's practice.",
    "Ten thousand hours begins with the next honest minute.",
    "Consistency turns effort into evidence.",
]


def object_id(value: ObjectId) -> str:
    return str(value)


def user_to_out(user: dict) -> dict:
    return {
        "id": object_id(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "auth_provider": user.get("auth_provider", "password"),
        "picture": user.get("picture"),
        "total_goal_hours": user.get("total_goal_hours", 10000),
        "created_at": user["created_at"],
    }


def entry_to_out(entry: dict) -> dict:
    return {
        "id": object_id(entry["_id"]),
        "title": entry["title"],
        "category": entry["category"],
        "minutes": entry["minutes"],
        "date": entry["date"],
        "notes": entry.get("notes", ""),
        "created_at": entry["created_at"],
    }


def start_of_week(value: date) -> date:
    return value - timedelta(days=value.weekday())


def month_key(value: date) -> str:
    return f"{value.year}-{value.month:02d}"


def utc_now() -> datetime:
    return datetime.now(UTC)
