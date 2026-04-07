#!/bin/sh
set -e

echo "Enabling pgvector extension..."
python -c "
import asyncio, asyncpg, os
async def enable_vector():
    url = os.environ.get('POSTMAIL_DATABASE_URL', '').replace('+asyncpg', '')
    conn = await asyncpg.connect(url)
    await conn.execute('CREATE EXTENSION IF NOT EXISTS vector')
    await conn.close()
    print('pgvector enabled')
asyncio.run(enable_vector())
"

echo "Running database migrations..."
python -m alembic upgrade head

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
