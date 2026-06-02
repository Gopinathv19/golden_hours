from datetime import date as Date
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        normalized = " ".join(value.strip().split())
        if len(normalized) < 2:
            raise ValueError("Name must be at least 2 characters")
        return normalized


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class GoogleAuthIn(BaseModel):
    credential: str = Field(min_length=20)


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    auth_provider: str = "password"
    picture: str | None = None
    total_goal_hours: float = 10000
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class EntryCreate(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    category: str = Field(default="Practice", max_length=60)
    minutes: int = Field(gt=0, le=1440)
    date: Date
    notes: str = Field(default="", max_length=500)


class EntryUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=120)
    category: str | None = Field(default=None, max_length=60)
    minutes: int | None = Field(default=None, gt=0, le=1440)
    date: Date | None = None
    notes: str | None = Field(default=None, max_length=500)


class EntryOut(BaseModel):
    id: str
    title: str
    category: str
    minutes: int
    date: Date
    notes: str = ""
    created_at: datetime


class SummaryOut(BaseModel):
    total_hours: float
    remaining_hours: float
    progress_percent: float
    today_hours: float
    week_hours: float
    month_hours: float
    day_to_day: list[dict]
    weekly: list[dict]
    monthly: list[dict]
    quote: str


class RangeQuery(BaseModel):
    range: Literal["daily", "weekly", "monthly"] = "weekly"
