from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_uri: str = Field(default="mongodb://localhost:27017", alias="MONGODB_URI")
    mongodb_db: str = Field(default="golden_hours", alias="MONGODB_DB")
    jwt_secret: str = Field(default="change-this-secret", alias="JWT_SECRET")
    jwt_expires_minutes: int = Field(default=10080, alias="JWT_EXPIRES_MINUTES")
    cors_origins: str = Field(
        default="http://localhost:5173,http://localhost:3000,https://gopinathv19-golde-hours-front-end.hf.space",
        alias="CORS_ORIGINS",
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
