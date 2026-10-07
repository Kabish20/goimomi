import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


# Select engine target
db_url = settings.DATABASE_URL
if settings.USE_SQLITE_FALLBACK:
    try:
        # Check if DATABASE_URL is postgresql
        if "postgresql" in settings.DATABASE_URL:
            # We will default to sqlite for local standalone development unless Postgres is configured and tested
            logger.info("Configured with SQLite fallback capability")
    except Exception as e:
        logger.warning(f"Error checking DB URL: {e}")

# We create the primary async engine
# Note: For SQLite, check_same_thread is needed if multi-threaded, but asyncio uses async driver
connect_args = {}
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    future=True,
    connect_args=connect_args,
)

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


from contextlib import asynccontextmanager


def _switch_to_sqlite():
    global engine, async_session_maker
    if "sqlite" not in str(engine.url):
        logger.info(f"Switching database engine to SQLite: {settings.SQLITE_URL}")
        engine = create_async_engine(
            settings.SQLITE_URL,
            echo=False,
            future=True,
            connect_args={"check_same_thread": False},
        )
        async_session_maker = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Returns the current active session factory."""
    global async_session_maker
    return async_session_maker


@asynccontextmanager
async def get_session_context() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager yielding a database session."""
    factory = get_session_factory()
    try:
        async with factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
    except Exception as exc:
        if settings.USE_SQLITE_FALLBACK and "sqlite" not in str(engine.url):
            logger.warning(f"DB session error ({exc}), activating SQLite fallback.")
            _switch_to_sqlite()
            factory = get_session_factory()
            async with factory() as session:
                yield session
        else:
            raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for acquiring database sessions per request."""
    factory = get_session_factory()
    try:
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    except Exception as exc:
        if settings.USE_SQLITE_FALLBACK and "sqlite" not in str(engine.url):
            logger.warning(f"Connection error ({exc}), activating SQLite fallback.")
            _switch_to_sqlite()
            # Ensure tables created in SQLite
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            factory = get_session_factory()
            async with factory() as session:
                try:
                    yield session
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
                finally:
                    await session.close()
        else:
            raise


async def init_db() -> None:
    """Initialize database schema tables."""
    global engine, async_session_maker
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database schema initialized successfully.")
    except Exception as exc:
        if settings.USE_SQLITE_FALLBACK and "sqlite" not in str(engine.url):
            logger.warning(
                f"PostgreSQL connection failed ({exc}). Falling back to local SQLite: {settings.SQLITE_URL}"
            )
            engine = create_async_engine(
                settings.SQLITE_URL,
                echo=settings.DEBUG,
                future=True,
                connect_args={"check_same_thread": False},
            )
            async_session_maker = async_sessionmaker(
                bind=engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autocommit=False,
                autoflush=False,
            )
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("SQLite database fallback schema initialized successfully.")
        else:
            logger.error(f"Failed to initialize database: {exc}")
            raise exc
