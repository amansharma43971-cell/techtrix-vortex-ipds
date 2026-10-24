import os
import asyncpg
from contextlib import asynccontextmanager

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://pds_admin:pds_secret_2026@postgres:5432/bhandarsetu"
)

pool: asyncpg.Pool = None

async def init_db_pool():
    global pool
    pool = await asyncpg.create_pool(
        dsn=DATABASE_URL,
        min_size=5,
        max_size=25,
        command_timeout=30.0
    )
    print("PostgreSQL connection pool initialized.")

async def close_db_pool():
    global pool
    if pool:
        await pool.close()
        print("PostgreSQL connection pool closed.")

async def get_connection():
    if not pool:
        raise RuntimeError("Database connection pool is not initialized.")
    return pool.acquire()
