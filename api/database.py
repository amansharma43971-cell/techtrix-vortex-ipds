import os
import asyncpg
from contextlib import asynccontextmanager

def get_database_url() -> str:
    """Build or retrieve database URL from environment variables."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return db_url

    user = os.getenv("POSTGRES_USER", "pds_admin")
    password = os.getenv("POSTGRES_PASSWORD", "pds_secure_password")
    host = os.getenv("POSTGRES_HOST", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")
    db_name = os.getenv("POSTGRES_DB", "bhandarsetu")
    return f"postgresql://{user}:{password}@{host}:{port}/{db_name}"

DATABASE_URL = get_database_url()

pool: asyncpg.Pool = None

async def init_db_pool():
    global pool
    url = get_database_url()
    try:
        pool = await asyncpg.create_pool(
            dsn=url,
            min_size=5,
            max_size=25,
            command_timeout=30.0
        )
        print("PostgreSQL connection pool initialized successfully.")
        return pool
    except Exception as e:
        print(f"Warning: PostgreSQL connection pool failed to initialize ({e}). Operating in memory-fallback mode.")
        pool = None
        return None

async def close_db_pool():
    global pool
    if pool:
        await pool.close()
        pool = None
        print("PostgreSQL connection pool closed.")

def get_pool() -> asyncpg.Pool:
    return pool

@asynccontextmanager
async def get_db_connection():
    if not pool:
        raise RuntimeError("Database connection pool is not initialized.")
    async with pool.acquire() as conn:
        yield conn
