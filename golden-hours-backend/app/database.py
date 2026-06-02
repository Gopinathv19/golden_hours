import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import get_settings

client: AsyncIOMotorClient | None = None


def create_mongo_client() -> AsyncIOMotorClient:
    settings = get_settings()
    kwargs = {"serverSelectionTimeoutMS": 10000}
    if settings.mongodb_uri.startswith("mongodb+srv"):
        kwargs["tlsCAFile"] = certifi.where()
    return AsyncIOMotorClient(settings.mongodb_uri, **kwargs)


async def connect_to_mongo() -> None:
    global client
    client = create_mongo_client()
    db = get_database()
    await db.users.create_index("email", unique=True)
    await db.users.create_index("google_sub", unique=True, sparse=True)
    await db.entries.create_index([("user_id", 1), ("date", -1)])


async def close_mongo_connection() -> None:
    if client:
        client.close()


def get_database() -> AsyncIOMotorDatabase:
    if client is None:
        settings = get_settings()
        return create_mongo_client()[settings.mongodb_db]
    return client[get_settings().mongodb_db]
